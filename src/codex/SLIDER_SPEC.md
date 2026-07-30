# Zoom Slider Spec

Replace the zoom `Select` in **Eventmaps** and **Skilldex** with a slider: a horizontal one in
the search-panel header, and a vertical one in the floaty sticky container that appears on scroll.
A single number above the track shows the current zoom and updates live while dragging.

## Background: why this is safe for node caching

Both trees deliberately exclude `zoomLevel` from their layout memo, so **zoom never invalidates a
node-dimension cache** — it only re-runs the render effect.

- `EventTree` layout memo deps: `[event, showLoopingIndicator, levelOfDetail, showContinuesTags]`
  (`components/ResultsPanels/EventResultsPanel/EventTree/index.tsx`)
- `TalentTree` layout memo deps: `[talentTree, parsedKeywords, shouldShow*×4, isCardSetIndexSelected, areChildrenExpanded]`
  (`components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx`)
- `eventNodeDimensions` cache key: `event + showLoopingIndicator + levelOfDetail + showContinuesTags` — zoom-free
- `talentNodeDimensions` cache key: node characteristics + rendering context — zoom-free, and persists across tree changes

This is a stated invariant in `src/codex/CLAUDE.md`. **Do not add `zoomLevel` to either layout memo.**

The render effect is still not free — it does `selectAll('*').remove()` and redraws every node, link
and badge. A slider drag would fire it on every step crossing, so:

**Commit-on-release is required.** The displayed number follows the drag via local state; `zoomLevel`
is only committed on pointer-up. Two reasons beyond raw redraw cost:

1. `EventTree`'s `ZoomCalculator` **writes** to its `coverScale` cache when zoom is `COVER`
   (`useEventTreeZoom.ts`). Dragging *through* the Cover stop would re-measure and re-cache from
   mid-drag container dimensions.
2. `TalentTree`'s `getZoomScale` is stateless, so Skilldex has no such side effect — commit-on-release
   is required for Eventmaps, merely nice-to-have for Skilldex.

Eventmaps is the worst case for redraw cost (links + refChildren links + loop-back links + 6 badge
passes vs. Skilldex's single `tree()` layout). Tune for Eventmaps.

## Zoom stops

`Cover, 100, 125, 150, 175, 200` (6 stops, up from today's 4).

Unlabeled tick dots — no per-mark text labels — so crowding is not a concern and this is trivially
adjustable later. Drop to `Cover, 100, 125, 150, 200` if 6 feels too fine in practice.

Note the numbers are **not literal percentages** in every case:

- `EventTree`, small trees (`coverScale >= 1`): `zoomLevel / 100` is literal scale.
- `EventTree`, large trees (`coverScale < 1`): interpolates cover → actual size, where `200` means
  actual size and `100` means halfway between cover and actual.
- `TalentTree`: applies `depthMultiplier = 1 / maxDepth^0.25` on top, so effective scale differs per tree.

Fine-grained stops would imply precision that isn't there — this is why the count stays low.

## `ZoomLevel`: enum → plain type

Replace `enum ZoomLevel { COVER = 'cover', x100 = 100, ... }` with:

```ts
export type ZoomLevel = 'cover' | number
export const COVER: ZoomLevel = 'cover'
export const ZOOM_STOPS = [COVER, 100, 125, 150, 175, 200] as const
export const MAX_ZOOM_LEVEL = 200
export const formatZoomLabel = (zoom: ZoomLevel): string => (zoom === COVER ? 'Cover' : `${zoom}%`)
```

**Why:** the current mixed string/number enum typechecks awkwardly — it forces
`parseInt(zoomLevel.toString()) / 100` in `TalentTree` even though the value is already a number at
runtime. Adding a stop today means editing an enum member *plus* `ZOOM_LEVELS` *plus* `ZOOM_LABEL_MAP`.
With a plain type, `ZOOM_STOPS` is the single source, `formatZoomLabel` replaces the map, and
`zoomLevel / 100` typechecks directly after a `!== COVER` narrowing check.

**Accepted trade-off:** the enum's nominal-ish guarantee goes away — any number satisfies `ZoomLevel`,
so nothing prevents passing `137`. Acceptable because both trees do arithmetic on the value anyway and
the slider only ever emits `ZOOM_STOPS` members.

This rename ripples through `useAllEventSearchFilters`, both tree components, `TalentResultsPanel`,
`EventSearchPanel`, and the sticky component — do it in one pass (step 3).

## Steps, in execution order

### 1. Move `getEnergyImageUrl` to shared — COMPLETED

The image URLs it returns already live in `@/shared/utils/imageUrls` — `src/speedruns/utils/images.ts`
imports them from there. The only speedruns-specific part is the `SpeedRunSubclass` half of the union.

- New `src/shared/utils/energyImages.ts` — `getEnergyImageUrl(classType: CharacterClass)`, the
  `CharacterClass` cases plus the `NeutralImageUrl` default.
- Speedruns keeps a thin wrapper in its own `images.ts` handling `SpeedRunSubclass` and delegating to
  the shared function for `CharacterClass`.

Keeping the wrapper avoids dragging the speedruns-only `SpeedRunSubclass` type into `shared/`, which
would be a layering violation (`shared/` must not know about `speedruns/`).

### 2. Move `Thumb` to shared — and make it orientation-aware — COMPLETED

`src/speedruns/components/Sliders/Thumb/` → `src/shared/components/Sliders/Thumb/`. The component
file already takes `energyIcon` as a plain string prop and has zero speedruns imports — pure
react-aria + SCSS. Both the speedruns `Slider` and the new codex `ZoomSlider` import it, which
guarantees an identical thumb across tools (most of the visual-consistency win).

**The SCSS is not a pure move.** `Thumb/index.module.scss` hardcodes horizontal-only centering:

```scss
top: 50%;
transform: translate(-50%, -52%);   // also in :hover and :active, with !important
```

In vertical orientation react-aria sets `thumbProps.style.top` to the position percentage, which the
stylesheet's own `top: 50%` fights, and the `-52%` Y-centering nudge becomes an X-centering problem.
So `Thumb` needs an `orientation` prop (or a modifier class) that swaps the centering axis — the
`!important` on the `:hover`/`:active` transforms means both variants need the same treatment.

Keep it minimal, and confirm the speedruns thumb renders **identically** afterward (including hover
scale-up and active scale-down).

**As implemented — one correction to the above.** react-aria sets
`transform: translate(-50%, -50%)` **inline** on the thumb in *both* orientations (verified by probing
the library, not from docs). Inline styles beat the stylesheet, so the base `transform` rule needs
`!important` too — not just `:hover`/`:active`. A consequence worth knowing: the original horizontal
`-52%` nudge was silently never applying except on hover/active, where `!important` was already
present. Both orientations now carry `!important` on all three transform rules.

The speedruns horizontal `Slider` **stays in speedruns** — it is horizontal-only (track `height`,
fill `width`, marks positioned by `left`) and carries text mark labels with mobile -45° rotation.
Generalizing it for one new consumer isn't worth the coupling.

### 3. New `ZoomSlider` component — COMPLETED

`src/codex/components/shared/ZoomSlider/`. Wires `@react-aria/slider` + `@react-stately/slider`
directly (~30 lines, both already dependencies) rather than reusing the speedruns `Slider`.

- `orientation: 'horizontal' | 'vertical'`
- **As implemented:** a static "Zoom" label *above* the track and the live value *below* it in a
  smaller font (`font-size: xxs`), not a single number above. The value has a reserved `min-width`
  because "Cover" and "100%" have different text widths and would otherwise resize the whole control
  as you drag.
- Unlabeled tick dots at each stop, **inset from both track ends by half a tick diameter**
  (`TICK_INSET`) — centered on the ends they half-protrude past the rounded caps and read as a second
  bar behind the track. `overflow: hidden` on the track is *not* an option: the thumb is a child of the
  track and far larger than it, so it would be clipped.
- Vertical orientation puts Cover at the bottom and the max at the top. react-aria already does this
  (at the minimum value it emits `top: 100%`), so `getThumbPercent` — which is orientation-agnostic —
  feeds a fill anchored at `bottom: 0` growing upward, and ticks offset from `bottom`. Don't "invert"
  the mapping; that desynchronises the fill from the thumb.
- Commit `zoomLevel` on pointer-up only (see Background)
- `aria-label` for the slider — the `Select` it replaces had a real `label="Zoom"`, so the slider must
  not end up an unlabeled control
- Reuses shared `Thumb`; copies the track visual tokens from the speedruns `Slider` SCSS
  (track `height: 0.5rem`, `border-radius: 1rem`, class-color fill via `getClassColor`) so it reads
  as the same visual family. Copy the tokens — don't share the stylesheet, which would mean threading
  orientation through it.

Do the `ZoomLevel` enum → plain type conversion in this step, since `ZoomSlider` is its first consumer.

**Gotcha, hit during implementation:** `COVER` must be declared `as const`, not annotated
`: ZoomLevel`. With the annotation its type is the full `'cover' | number` union, so `zoomLevel === COVER`
narrows nothing and every `zoomLevel / 100` fails to typecheck.

**Keyboard stepping:** `useSliderThumb` provides arrow-key stepping for free, and each press commits
immediately — so holding an arrow key redraws per step, bypassing commit-on-release. **Accept this
initially**; key-repeat is far slower than a drag. Revisit only if it feels janky, and if so debounce
keyboard commits the same way the deferred wheel handler will.

### 4. `StickyZoomSelect` → `StickyZoomSlider` — COMPLETED

`src/codex/components/shared/StickyZoomSelect/` → `StickyZoomSlider/`, rendering a **vertical**
`ZoomSlider` in place of the `Select`. Keep the existing fixed-position box, `fadeInFromRight` /
`fadeInFromLeft` animations, and `position` prop.

- Eventmaps: `position="right"` (unchanged), Sunforge energy orb (`HolyImageUrl`) — matches its yellowish tint
- Skilldex: Rogue energy orb (`DexImageUrl`) — matches its greenish tint. Its `position` is
  **`isMobile ? 'left' : 'right'`**, not statically left as first assumed here; left unchanged.

Both tools switch together so their floaty controls don't diverge.

**Known hazard — Skilldex's sticky positioning is stateful.** `TalentResultsPanel` writes a
`--sticky-zoom-margin` CSS variable onto `document.documentElement` from its own scroll listener,
flipping between `6rem` and `-2rem` past 100px of scroll, consumed by
`results-panel__sticky-zoom { margin-top: var(--sticky-zoom-margin, 6rem) }`. Combined with
`useStickyZoom(0, 1300)` — threshold `0` means on desktop it is *always* shown and slides rather than
fades in. A vertical slider is taller than the select it replaces, so **both margin values will likely
need re-tuning**. It's a global CSS variable rather than component-local state; leave that as-is unless
it actually blocks the change.

**Outcome:** no re-tuning was needed — the existing `6rem` / `-2rem` values worked with the taller
vertical slider, verified on desktop and in Chrome responsive view.

**Don't harmonize the thresholds.** Eventmaps uses `useStickyZoom(250, 300)`, Skilldex uses
`useStickyZoom(0, 1300)`. They differ because the two pages scroll very differently — out of scope.

### 5. Header slider + layout — COMPLETED

Replace the zoom `Select` in `EventSearchPanel` with a horizontal `ZoomSlider`, in place in the
`.controls` row. `.controls` is already `display: flex` + `flex-wrap: wrap` + `gap: 1rem`, so:

- **Desktop:** widen `.control-wrapper--zoom` from `min-width: 6rem; flex: 1` to roughly
  `min-width: 11rem; flex: 1.5`. Taking the share from `--event`'s `flex: 2` is fine — that select is
  generously sized. Check the narrow end of desktop: 4 wrapper children plus `1rem` gaps is already
  close to wrapping.
- **Mobile:** add `flex-basis: 100%` inside the existing `$breakpoint-mobile` block, so zoom drops to
  its own full-width row under the event select with the buttons wrapping below. There is precedent —
  another wrapper in the same file already does this. Full width also gives the tick dots and number
  label real room and fixes what would be a miserable 5rem touch target.

**Alignment detail:** `Select` renders its own `label="Zoom"` above the control, which is what
vertically aligns it with the event select and the `align-items: flex-end` buttons. The slider's
number label must occupy the same vertical slot so the row doesn't jump — render a label row of the
same height with the live value in it.

**As implemented:** the horizontal variant puts "Zoom" and the live value on a shared top line, with
the track on a second line. The DOM is *identical* to the vertical variant — the difference is CSS
`order` + `flex-basis` — so there is only one markup path to maintain. Mobile also needed
`min-width: 0` alongside `flex-basis: 100%`, to release the `11rem` desktop minimum. The value keeps
its reserved `min-width` here too, so "Cover" → "100%" can't shift the row.

Skilldex's zoom state is plain `useState` in `TalentResultsPanel` (Eventmaps' lives in
`useAllEventSearchFilters`); Skilldex has no header zoom control, only the sticky one.

### 6. Update docs — COMPLETED

If any step changes behavior or structure described in an existing `CLAUDE.md` or `README.md`, update
it in the same pass. Known candidates:

- `src/codex/CLAUDE.md` — **done**: added `components/shared/ZoomSlider/` to key files, strengthened the
  layout/render invariant to forbid adding `zoomLevel` to the layout memos, and added the
  commit-on-drag-end and `ZOOM_STOPS` invariants
- `src/speedruns/CLAUDE.md` — **checked, no change needed**: it never mentioned sliders, `Thumb`, or
  `utils/images.ts`
- Root `CLAUDE.md` — **done**: added `Sliders/Thumb` to shared components and `energyImages.ts` to
  shared utilities
- `src/codex/utils/eventTreeSpacing/README.md` — **checked, no change needed** (untouched by this work)

### 7. Verification

- `npm run verify` (format:check, lint, type-check, test) — required before the work is considered done
- Manual visual testing is done by **Joel**, not by Claude. Claude reports when the change is ready
  and lists what to look at. Per repo policy, tree rendering is verified by manual before/after
  comparison in the dev server, not unit tests — and no permanent test files are added.

What to check manually:

- Eventmaps: every zoom stop, header slider and sticky slider, expanded/collapsed nodes, all three
  levels of detail, drag mode and scroll mode
- Skilldex: every zoom stop via the sticky slider, expanded/collapsed nodes
- Both: mobile layout — the header slider on its own row, the vertical sticky slider's thumb travel
- **Speedruns page** — steps 1 and 2 touch it, so both its single- and double-thumb sliders must look
  and behave exactly as before, including thumb hover/active scaling
- Number label updates live during drag; the tree redraws only on release
- Vertical slider: thumb centers on the track and travels the full range; Skilldex's sticky container
  still repositions correctly as you scroll past 100px (the `--sticky-zoom-margin` flip)
- Keyboard: arrow keys step through the stops on both orientations

## Deferred: cmd/ctrl + wheel zoom

Not in this scope. Recorded so step 3 doesn't paint us into a corner.

- `ctrl+wheel` is the browser's pinch-zoom gesture (trackpad pinch arrives *as* `ctrl+wheel`), so it
  must be `preventDefault()`ed — which requires a **non-passive** `wheel` listener added via
  `addEventListener` on the scroll wrapper. A React `onWheel` prop won't work; React attaches those
  passively at the root. Honor either modifier and preventDefault on both (cmd+wheel is browser zoom
  in some macOS browsers).
- **Debounce-on-idle, not throttle.** Accumulate wheel deltas into a pending stop, update the number
  label immediately (cheap — it's a text node), commit `zoomLevel` ~120–150ms after the wheel stops.
  Throttling would redraw repeatedly mid-gesture; debouncing redraws once when the user settles.
  Discrete stops are self-limiting anyway — a whole gesture may only cross 2–3 stops.
- Plain wheel (no modifier) must keep scrolling the tree — the handler bails out and does *not*
  preventDefault when no modifier is held. Eventmaps also has drag-to-scroll and scrolls in all
  directions.
- When this lands, extract a `useZoomControl` hook in codex owning
  `{ committedZoom, pendingZoom, setPendingZoom, commit }`, with the slider and the wheel handler as
  its two consumers. **Not before** — with only the slider, commit-on-release stays inline rather than
  becoming a single-consumer abstraction.
