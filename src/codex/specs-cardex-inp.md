# Spec: Reducing Cardex INP

Cardex's Vercel Speed Insights **INP** score is **568ms at P75** (175 samples, "Poor" — above the
500ms threshold). A Performance trace shows the cost is layout and paint of the results list, not
React's work in producing it.

The spec is in **two phases, and Phase B may never happen**:

- **Phase A (Tasks 1–2)** — low-disruption attempts that change no behaviour: a CSS property that
  lets the browser skip off-screen work, then deferring the list update to a later frame. Try these
  first, one at a time, in order.
- **Phase B (Tasks 3–6)** — virtualization. Real behavioural change: off-screen rows leave the DOM
  and Ctrl-F stops finding them. **Only if Phase A misses the target.**

Measure after every task and record it in *Results after each task*. Stop as soon as the number is
good enough.

## Baseline measurements

**Record these. Every task re-measures with the identical method and compares against them** —
without a before, "it feels faster" is the only available verdict, and this whole investigation
demonstrated how unreliable that is.

### Field data — Vercel Speed Insights, Desktop, early Sep 2026

INP at P75, per route:

| Route | P75 INP | Samples | Rating |
|---|---|---|---|
| `/cardex` | **568 ms** | 175 | Poor (>500ms) |
| `/skilldex` | 320 ms | 40 | Needs Improvement |
| `/eventmaps/[event]` | 256 ms | 127 | Needs Improvement |
| `/speedruns` | 232 ms | 4 | Needs Improvement |
| Site-wide | 324 ms | — | Needs Improvement |

This spec targets `/cardex` only. Whether the same fix applies to the tree-based tools is an open
question — they render one large SVG rather than many DOM rows, so the cost is likely shaped
differently and needs its own trace before assuming anything.

### Lab data — DevTools Performance panel

Method, to be repeated verbatim for the after-measurement: dev server, **CPU unthrottled**, record,
tick a single filter checkbox that expands the result set (the "show all green banner cards"
toggle), stop, then drag-select the range covering just that interaction.

**One interaction, 4.93s–6.21s:**

| | |
|---|---|
| Rendering (style + layout) | 613 ms |
| Painting | 314 ms |
| Scripting | 251 ms |
| System | 97 ms |
| Messaging | 1 ms |
| **Total** | **1277 ms** |

**Wider range including load, 0–6.24s** (kept as a cross-check that the ratio is not an artifact of
where the selection was drawn):

| | |
|---|---|
| Rendering | 2340 ms |
| Painting | 1420 ms |
| System | 1393 ms |
| Scripting | 978 ms |
| **Total** | **6239 ms** |

Layout and paint are **3.7× scripting** in the narrow range, and hold the same ratio in the wide one.

**The target: Rendering + Painting, currently 927ms on the single interaction.** Scripting at 251ms
is not what this spec is trying to move.

Note the lab total (1277ms) exceeds the field P75 (568ms) because this is a dev build. Use lab
numbers to compare before/after, and field numbers to decide whether the problem is solved — they
are not comparable to each other.

### Results after each task

Fill this in as tasks land. **This table decides whether the next task happens** — if a task gets
Rendering + Painting close to the target, stop and skip the rest.

| After | Rendering | Painting | **R+P** | Scripting | Total |
|---|---|---|---|---|---|
| Baseline | 613 ms | 314 ms | **927 ms** | 251 ms | 1277 ms |
| Task 1 — `content-visibility` | | | | | |
| Task 2 — `useDeferredValue` | | | | | |
| Task 5 — virtualization | | | | | |

## Why this, and not the other candidates

The cost is the *volume of DOM* being laid out and painted, not React's work in producing it.

This matters because several plausible-sounding fixes were investigated and are **not** the answer:

- **Memoization.** `ResultCard` took the whole `useSearchFilters` object, which is rebuilt on every
  render, so its `memo` never held. Real, and fixed (see *Already done*), but it targets the 251ms
  scripting slice — a total win there is capped at ~20% of the interaction.
- **Redundant state updates in `useCardImageSrc`.** Also real, also fixed, same 20% ceiling.
- **`next/image` per-image overhead.** Each artwork is `unoptimized` (deliberately — Vercel cache
  limits, and Blightbane serves appropriately-sized webp), so the component's machinery buys little.
  Still scripting-side; not worth acting on until layout cost is addressed.

React DevTools Profiler was used first and **misled the investigation three times**. Its "what caused
this update" list names components that *scheduled* updates, not components that re-rendered
expensively — and on both old and new code that list contained only newly-mounted cards, which is
normal. Profiler answers "which components rendered"; it does not answer "where did the milliseconds
go." For this class of problem, start with the Performance panel.

## How to work through this spec

### What to read first

- **Root `CLAUDE.md`** — Working Style (the user runs the dev server, not the agent), the no-permanent-tests
  policy, and `npm run verify` as the required check.
- **`src/codex/CLAUDE.md`** — three invariants constrain this work directly:
  - *"Both tree components are `React.memo`'d and take scalar props, not whole hook-result objects."*
    Cardex now follows the same rule; keep it that way when props move around.
  - *"`.result-card__name`'s widths are minimums, not fixed sizes."* Its `flex-shrink: 1` +
    `min-width: 0` are what keep the `CardMetadata` pill pinned right on narrow widths. Row
    measurement must not introduce a fixed width here.
  - *"Tree layout/rendering changes are verified visually … The **user** runs the dev server."*
    Applies equally to this list.
- **`src/codex/components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss`** — the
  comment block above `$row-entry-animation` explains why the animation is declared once and
  restated in `--full-match`, and why `backwards` is load-bearing.
- **`src/styles/_textures.scss`** — `rainTexture` and `_applyTexture`. Read before Task 4; the
  banner styling is the hard part of this spec and the reason Task 4 exists at all.

### Where to stop

**Tasks pause for confirmation. Do not chain them.**

Each task is also a **decision point about whether the next one happens at all**. Measure, record,
and only continue if the target is still missed — that is the whole reason the tasks are ordered by
disruption rather than by ambition.

In Phase B especially, every task changes how the same list of rows is built, positioned and
painted, against a stylesheet whose group backgrounds, alternating textures and entry animation all
key off DOM structure. A mistake in Task 4 (banner rendering) surfaces as "the texture looks
slightly wrong", which is invisible under the scroll behaviour Task 5 introduces on top of it. Land
them one at a time.

After each task: get it into a state the user can look at, mark the task `COMPLETED` in this spec,
say what changed and which states to compare, and wait. **The user runs the dev server.**

Task 3 has **no visible effect of its own** — it only moves existing rendering into its own
component. That is expected, not a broken step.

### How it gets verified

- `npm run verify` after every task (required).
- `npm run build` after Task 5 — it adds a dependency and changes what the page bundle pulls in.
- **Visually, by the user, at each pause.** The states below matter most in Phase B, where the list
  diverges structurally from a plain one — but check scrolling, the entry animation and both
  breakpoints after Phase A's tasks too, since `content-visibility` and deferred rendering can both
  affect them:
  - **Small result set (a handful of rows, one banner group)** — goes through the virtualizer like
    any other, so it needs checking on its own rather than being assumed safe. Watch for a row
    range shorter than the viewport, and for a group background sized from a single row.
  - **Large result set spanning several banner groups** — group textures and their alternation, the
    gradient across each group, borders between groups.
  - **Search → results appear** — the staggered entry cascade, and that it still runs across a
    banner boundary rather than restarting.
  - **Scrolling a large set** — no flicker, no rows animating in on scroll, no jumping scrollbar.
  - **Striking a card** (with description on and off) — row height changes on strike; a virtualizer
    with stale measurements will visibly misplace subsequent rows.
  - **Mobile and desktop** — keywords move to their own row on mobile, so rows are a different
    height there. Check both.
  - **Formatting toggles** (card art, description, keywords, card set/type, Blightbane link) — each
    changes row height for every row at once.
- **Re-measure INP after every task** with the same Performance-panel method described above, on the same
  interaction, and record the new Rendering/Painting/Scripting split in this spec. If layout+paint
  has not dropped substantially, stop and reconsider rather than continuing to the next task.

### Which docs change with the work

- **`src/codex/CLAUDE.md`** — needs a new invariant once Task 5 lands, covering: that the results
  list is always virtualized (no un-virtualized path, and Ctrl-F across all results is deliberately
  given up), that banner groups are *containers* whose gradient and tiled texture cannot be
  reproduced per-row, and that row heights are measured rather than assumed because strike state and
  the formatting filters change them. Add it in the same task that introduces the behaviour.
- **`src/codex/components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss`** — the
  `$row-entry-animation` comment block describes a cascade that runs over the whole result set.
  Task 6 narrows that to the first screenful; update the comment with it.
- **Root `CLAUDE.md`** — only if a dependency is added that other work should know about
  (`@tanstack/react-virtual` in Task 5). A line in Data Layer or PWA & Performance, not a new section.
- If any task appears to contradict an invariant in `src/codex/CLAUDE.md`, **raise it with the user**
  rather than rewriting the invariant to fit the change.

### Comment style

The non-obvious *why*, in a line or two. The things worth a comment here: why banner groups can't be
flattened into per-row backgrounds, why row heights are measured rather than computed, why the group
background is positioned from measured offsets. Not: what a virtualizer is, or a history of this spec.

## Decisions already made

These were decided with the user before drafting. Do not re-litigate them mid-implementation.

**Decisions 1–3 apply to Phase B only** — they describe how virtualization should work *if* it turns
out to be needed. Nothing in Phase A depends on them.

1. **Try the low-disruption options before virtualizing.** `content-visibility` and deferred
   rendering both attack the same layout-and-paint cost without changing behaviour, so they come
   first and virtualization is the fallback. An earlier draft went straight to virtualization; that
   was reordered because a four-task rewrite is a poor opening move against a problem one CSS
   property might solve.
2. **Always virtualize — one rendering path, no threshold.** An earlier draft virtualized only above
   a row count, to keep browser find (Ctrl-F) working for smaller result sets. That was dropped
   deliberately: **two rendering paths is a permanent maintenance cost**, and every future change to
   the results list would have to be built and visually verified twice. Ctrl-F now searches only
   mounted rows at every result-set size. That is accepted — Cardex's own keyword search is the
   intended way to find a card and also searches descriptions, which Ctrl-F cannot.
3. **Flatten to a single list**, with banner headers interleaved as rows — not a nested virtualizer
   per group. See Task 4 for what this costs and how the styling is kept.
4. **The entry-stagger animation runs on the first screenful only.** Rows scrolled to later appear
   without animation. A permanent shimmer while scrolling a long list is worse than a cascade that
   only plays where the user actually sees it. Note `entryIndex` is already capped at
   `ENTRY_STAGGER_MAX_ROWS = 12`, so rows past the 13th already start together today — this is a
   smaller behavioural change than it sounds.
5. **Reducing per-row DOM is out of scope.** Slimming the icon column, nested spans and description
   wrapper is a plausible follow-up, but is not tasked here. Decide on it after the Phase A
   measurements, with data.

### Left to trial and error in the browser

- **`contain-intrinsic-size`** (Task 1). Measure a row in DevTools with description on and start
  there; it only needs to be close.
- **`overscan`** (Task 5, rows rendered beyond the viewport). Start at 5. Too low flickers on fast
  scroll, too high gives back the win.
- **Estimated row height** (Task 5) for the initial measurement pass. Whatever the measured average
  is with description on; it only affects scrollbar accuracy before rows are measured.

## Already done (not tasks — context)

Two changes landed during the investigation. Both are defensible as code hygiene and match documented
invariants, but **neither is a demonstrated INP win** and neither should be credited with one:

- `useCardImageSrc` derives its src during render instead of storing it and re-setting it in an
  effect. Removes a redundant state update per artwork and fixes a latent stale-error bug (an error
  recorded for one card name could suppress the next card's artwork). The effect existed for
  `BolgarsBlueprintsPanel`, whose card name arrives from an async fetch; deriving handles that case
  correctly and one commit earlier.
- `ResultCard` takes scalar props instead of the `useSearchFilters` object, and `useCardStrike`
  exposes a `Set` with ref-stable callbacks. This makes the pre-existing `memo` actually hold, and
  brings Cardex in line with the codex invariant the tree components already follow.

---

## Phase A — Low-disruption attempts (Tasks 1–2)

**Try these first, one at a time, in this order, measuring after each.** Both attack the same
Rendering + Painting cost as virtualization but change far less: neither alters the DOM structure,
the banner grouping, the entry animation, or how the user scrolls. Either may be enough on its own.

**Only proceed to Phase B if both have landed and the measurement still misses the target.** If
Task 1 alone gets Rendering + Painting down substantially, stop there and skip the rest — this spec
exists to fix a number, not to ship a virtualizer.

## Task 1 — `content-visibility: auto` on result rows

The highest impact-to-disruption ratio of anything in this spec, and the reason to try it before
touching any component. One CSS property tells the browser to skip style, layout and paint for
off-screen elements — browser-native virtualization, with no JS, no dependency, and no change to
the component tree or the DOM.

Add to `.result-card` in
`src/codex/components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss`:

```scss
content-visibility: auto;
contain-intrinsic-size: auto <measured row height>;
```

- **`contain-intrinsic-size` is not optional.** Without it, skipped rows report zero height and the
  scrollbar jumps around as rows render on scroll. Use `auto <height>` so the browser remembers each
  row's real size once measured. Get the starting value by measuring a row in DevTools with
  description on — it does not need to be exact, only close.
- **Check the entry animation.** A row that is skipped while off-screen may run its entry animation
  when scrolled into view, which is the same problem Task 6 solves for virtualization. If it does,
  note it here — it may make Task 6 relevant even without virtualization.
- Chrome and Edge support this well (and Speed Insights measures Chrome); Safari added support more
  recently. Unsupported browsers ignore it and render as today, so this is safe to ship regardless.

**Verify:** `npm run verify`. Visually: scroll a large result set looking for flicker, layout shift,
or a jumping scrollbar; check the entry animation after a search; check mobile and desktop. Then
**re-measure and record below**. Rows must also still be findable — confirm Ctrl-F still matches
off-screen rows (`content-visibility: auto` keeps them in the DOM, unlike virtualization, so it
should).

## Task 2 — Defer the list update with `useDeferredValue`

**Only if Task 1 alone did not get there.**

INP is scored on the first paint after the interaction. This splits the work across frames so the
checkbox state paints immediately and the heavy list renders at lower priority:

```
click → paint checkbox + filter state (INP measured here)
      → render rows in a later frame
```

In `CardResultsPanel`, derive the rendered list from a deferred copy of `matchingCards` (or wrap the
filter state update in `startTransition`) so React can paint the search panel's own update before
committing the rows.

**Be honest about what this does:** it reduces the *measured* interaction without reducing the total
work. The rows still cost what they cost, and on a slow device the list visibly lags the checkbox by
a frame or two. That is a real trade, not a free win — if it feels worse to use, say so and drop it
rather than keeping it for the metric.

- Keep the deferred value confined to the results list. The search panel's checkboxes must stay
  immediate, or the control feels unresponsive, which is the opposite of the goal.
- Watch for a stale-results flash: the list shows the previous result set for a frame while the new
  one renders. Usually fine, occasionally jarring when the sets differ wildly.

**Verify:** `npm run verify`. Visually: tick a filter and watch whether the checkbox responds
instantly and whether the list lagging behind it reads as responsive or as broken. Check on a
throttled CPU (4×) — that is where the trade shows. Then **re-measure and record below**.

## Phase B — Virtualization (Tasks 3–6)

**Only if Phase A has landed and the numbers still miss.** Everything below changes how the tool
behaves: off-screen rows leave the DOM, Ctrl-F stops finding them, and the banner grouping and entry
animation both need rebuilding around it. That is why it is last, not first.

## Task 3 — Extract the row list

**No visible change.** Preparation only.

`CardResultsPanel` currently builds banner groups and rows inline in `renderMatchingCards`. Extract
that so the list has its own component to change in later tasks:

- Extract the current grouped rendering into `CardResultsList` (its own file under
  `CardResultsPanel/`), taking `cardsByBanner`, the per-row scalars `ResultCard` needs, and
  `showCardsWithoutKeywords`.
- Keep `KeywordsSummary` and the no-keywords empty state in `CardResultsPanel` — they are not part
  of the scrolling list.
- Preserve `entryIndex` continuing across banner groups (`precedingCards`), exactly as today.

**Verify:** `npm run verify`. Visually, nothing whatsoever should change at any result-set size —
that is the check.

## Task 4 — Make banner groups renderable as flat rows

This is the task that decides whether the flatten approach is viable, so it is done and looked at
**before** any virtualizer is introduced.

**The problem.** `results-cards__banner--N` is not a label — it is a styled container:

```scss
@include rainTexture($color, false);   // horizontal gradient + tiled ::before texture
&:nth-child(even) &__banner--#{$number} { @include rainTexture($color, true); }  // flipped alternate
```

`rainTexture` applies `linear-gradient(to right, $color, $color-component-bg)` **across the group's
full width**, plus a `2rem`-tiled texture on a `::before` spanning the group's full height, at 0.35
opacity — flipped on every other group. Splitting this into per-row backgrounds restarts the
gradient on each row and re-tiles the texture per row, which will show as banding. The alternation
also depends on `nth-child` over group elements that no longer exist in a flat list.

**The approach.** Keep a group *container* in the flat list, but let it be positioned by the
virtualizer rather than by document flow:

- Render a flat item list of `{ type: 'banner-header', banner, groupIndex } | { type: 'card', card,
  entryIndex, banner }`.
- The banner background becomes an absolutely-positioned element behind its group's row range,
  sized from the virtualizer's measured offsets for the group's first and last visible row, so the
  gradient and texture span the group as they do today.
- Alternation moves from `nth-child(even)` to an explicit `groupIndex % 2` class, since DOM position
  no longer corresponds to group order.

**In this task, build it without the virtualizer:** render the flat list in document flow with the
group background absolutely positioned over its range. If it is visually identical to today at that
point, the approach carries over to Task 3. If the texture cannot be made to match, **stop and raise
it** — the fallback is nesting a virtualizer per group, which was rejected for complexity but
becomes the option if the styling cannot survive flattening.

**Verify:** `npm run verify`. Visually, compare against today's list, over a **large** result set
spanning several banner groups: gradient direction and extent per group, texture tiling and its
alternation between adjacent groups, group borders, and the gap between groups. Compare at desktop
and mobile widths.

## Task 5 — Virtualize the list

Add `@tanstack/react-virtual` (chosen for dynamic row measurement — rows here are variable-height by
formatting filters, mobile layout, and strike state).

- Use `useVirtualizer` with `measureElement` so heights are measured, not assumed. Rows change
  height when the description toggles, when keywords wrap to their own row on mobile, and when a
  card is struck; fixed sizes will misplace rows in all three cases.
- Window scrolling, not an inner scroll container — the results panel scrolls with the page today,
  and changing that alters `ScrollToTopButton` and the sticky-zoom behaviour on other codex tools.
- `overscan: 5` to start.
- Applies at **every** result-set size — there is no un-virtualized path (see *Decisions already
  made*). A ten-row result must render correctly through the virtualizer, not around it.
- Re-measure row sizes when the formatting filters change, or heights go stale for every row at once.

**Verify:** `npm run verify` and `npm run build`. Then the full visual list under *How it gets
verified* — the strike case and the formatting toggles are the ones most likely to expose stale
measurements, and **small result sets now matter as much as large ones**, since they no longer have
a path of their own.

Then **re-measure INP**: same method, same interaction, same checkbox as the *Baseline measurements*
section, and record the new Rendering / Painting / Scripting split there beside the baseline. The
target is Rendering + Painting, 927ms at baseline. If it has not dropped substantially, stop and
reconsider rather than continuing to Task 6.

## Task 6 — Confine the entry animation to the first screenful

Today every row animates on mount, staggered by `entryIndex` (capped at 12 rows). With
virtualization, rows mount on scroll, so this would animate continuously while scrolling.

- Gate the animation on a flag that is true for the rows present in the first commit after a search
  and false thereafter — not on `entryIndex`, which is a position in the full list, not a statement
  about when a row mounted.
- The `results-container` is keyed on `parsedKeywords.join(',')` to remount and retrigger the
  cascade; that mechanism stays, and is what resets the flag.
- Update the `$row-entry-animation` comment block to say the cascade now covers the first screenful.

**Verify:** `npm run verify`. Visually: run a search and watch the cascade (it should look as it does
today for the visible rows, including across a banner boundary), then scroll down — later rows must
appear with no animation. Check a search whose results fit on one screen still animates fully.
