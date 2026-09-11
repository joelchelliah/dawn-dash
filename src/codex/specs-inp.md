# Spec: Reducing INP

Interaction-to-Next-Paint work across the site, per Vercel Speed Insights. **Cardex is done; the
other three tools are scoped but not investigated.**

| Part | Tool | Status |
|---|---|---|
| **Part 1** | Cardex (`/cardex`) | **DONE** — fixed at Task 1, 568 ms P75 was the worst route |
| **Part 2** | Skilldex, Eventmaps, Speedruns | **NOT STARTED** — candidates only, no trace yet |

**Part 1 is the bulk of this document** (*Baseline measurements* through Task 6) and is finished.
**Part 2 is at the end**, under *Part 2 — the other three tools*: a starting point for a later
session, deliberately written as hypotheses to test rather than tasks to implement.

> **Part 1 status: resolved at Task 1.** `content-visibility: auto` on `.result-card` cut
> Rendering + Painting 42% (904 ms → 524 ms), so **Tasks 2–6 were deliberately not implemented** and
> Phase B (virtualization) never happened. Tasks 2–6 are kept below as a written-up fallback in case
> field data still misses the 500 ms target — see *Verdict — stop after Task 1* before picking up any
> of them.

## Part 1 — Cardex

Cardex's INP was **568ms at P75** (175 samples, "Poor" — above the 500ms threshold). A Performance
trace showed the cost was layout and paint of the results list, not React's work in producing it.

Part 1 was structured in **two phases, and Phase B never happened**:

- **Phase A (Tasks 1–2)** — low-disruption attempts that change no behaviour: a CSS property that
  lets the browser skip off-screen work, then deferring the list update to a later frame. Tried
  first, one at a time, in order.
- **Phase B (Tasks 3–6)** — virtualization. Real behavioural change: off-screen rows leave the DOM
  and Ctrl-F stops finding them. **Only if Phase A missed the target.** It did not.

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

Part 1 targets `/cardex` only — it was both the worst route and the only one shaped right for the
fix that worked. The other three are picked up in *Part 2*, where the short answer is that they
render one large SVG or a canvas rather than many DOM rows, so the cost is shaped differently and
needs its own trace before assuming anything.

Note Cardex at 568 ms was also dragging the site-wide 324 ms figure up, so Part 1 should improve
that number too once samples accumulate. **Re-read these field numbers before starting Part 2** —
they predate the Cardex fix, and the per-route ranking may have changed.

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

**Outcome: Task 1 was enough. Tasks 2–6 were skipped** — see *Verdict* below.

Task 1 was measured as a **fresh matched pair**, both runs unthrottled, back to back on the same
machine: the change is two lines of CSS, so reverting to re-measure the before was cheaper than
trusting the earlier baseline. Use this pair for the comparison.

| After | Rendering | Painting | **R+P** | Scripting | System | Total |
|---|---|---|---|---|---|---|
| Baseline (re-measured) | 526 ms | 378 ms | **904 ms** | 415 ms | 152 ms | 2012 ms |
| Task 1 — `content-visibility` | 395 ms | 129 ms | **524 ms** | 382 ms | 296 ms | 2005 ms |
| | **−25%** | **−66%** | **−42%** | −8% | +144 ms | −7 ms |

Tasks 2–6 not measured — not implemented.

**What the numbers say, including the parts that don't flatter the change:**

- **Painting −66% is the win, and it is the expected shape.** Skipping paint for off-screen rows is
  exactly what the property does, so this is the slice that confirms it took effect.
- **Rendering fell only 25%.** Containment skips layout of each skipped row's *subtree*, but the row
  elements themselves are still styled — so style recalc still runs broadly. Consistent with the
  property working, not evidence against it.
- **Total barely moved (−7 ms), because System rose 144 ms.** Partly the browser's own bookkeeping
  for containment and intrinsic-size measurement, partly noise. So this bought a real cut in
  layout+paint, *not* a cut in the interaction's total wall time in this trace. Don't oversell it.

**The re-measured baseline differs from the original one recorded above** (526/378/415 vs
613/314/251 — Scripting 65% higher), same method and machine. Dev-server traces are that noisy,
which is why the pair was re-measured rather than compared across sessions, and why the 42% is
approximate. A throttled (4×) run was also taken but discarded: the recorded baseline was
unthrottled, so it had nothing to compare against.

### Verdict — stop after Task 1

Phase A's first task took R+P from 904 ms to 524 ms for two lines of CSS, no dependency, no DOM
change and no behavioural change. Per *Decisions already made*, that is where this stops:

- **Task 2 (`useDeferredValue`) skipped.** It reduces the *measured* interaction without reducing
  the work, at the cost of the list visibly lagging the checkbox. Not worth spending against a
  number that just improved this much.
- **Phase B (Tasks 3–6) skipped.** A virtualizer that gives up Ctrl-F is a poor trade for whatever
  is left.

**The open item is field data, which is what actually decides this.** Lab and field numbers are not
comparable (see above); `/cardex` needs to come in under 500 ms P75 in Speed Insights once this has
shipped and accumulated samples. **If it is still Poor, Task 2 is the next move** — it is left
written for that reason, not as a task anyone should pick up pre-emptively.

Visually verified by the user at desktop: rows, hover and struck state all unchanged. The specific
risk was that `content-visibility: auto` implies `contain: layout paint`, which could clip
`cardOverlayPositioningFix`'s deliberate 0.5rem background bleed on hovered and struck rows — it
does not.

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

## How to work through Part 1

Part 2 has its own guidance under *Part 2 — the other three tools*; this section is about the Cardex
tasks.

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

- **`src/codex/CLAUDE.md`** — Task 5's virtualization invariant is **moot** (never implemented).
  What *did* need recording is Task 1's: `.result-card` carries `content-visibility: auto`, so every
  row is a `contain: layout paint` context, and `contain-intrinsic-size` must stay paired with it.
  Added.
- **`src/codex/components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss`** — the
  `$row-entry-animation` comment block still describes a cascade over the whole result set, which is
  **still accurate**: Task 6 (which would have narrowed it to the first screenful) was never
  implemented. No change needed. The `.result-card` rule did gain a comment for
  `content-visibility`.
- **Root `CLAUDE.md`** — no change: this was conditional on Task 5 adding
  `@tanstack/react-virtual`, and no dependency was added.
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

## Task 1 — `content-visibility: auto` on result rows — COMPLETED

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

## Task 2 — Defer the list update with `useDeferredValue` — NOT IMPLEMENTED (fallback)

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

## Task 3 — Extract the row list — NOT IMPLEMENTED (fallback)

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

## Task 4 — Make banner groups renderable as flat rows — NOT IMPLEMENTED (fallback)

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

## Task 5 — Virtualize the list — NOT IMPLEMENTED (fallback)

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

## Task 6 — Confine the entry animation to the first screenful — NOT IMPLEMENTED (fallback)

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

---

# Part 2 — the other three tools

**Not started. Nothing here has been traced.** This section exists so a later session starts from
the right hypotheses instead of re-deriving them, and so nobody reaches for Part 1's fix on a tool
it cannot help.

## Read this first: Part 1's fix does not transfer

`content-visibility: auto` worked on Cardex because the results list is **many independent DOM rows
in a long scroll** — the property skips style, layout and paint per element, so there were hundreds
of elements to skip. None of the other three tools is shaped like that:

| Tool | What it renders | Why `content-visibility` is the wrong tool |
|---|---|---|
| Skilldex | one `<svg>`, drawn by D3 | `contain` does not apply to most SVG child content, so there is nothing to grip. The cost is **scripting** (D3 layout), not layout+paint. |
| Eventmaps | one `<svg>`, drawn by D3 | Same as Skilldex, plus `d3-flextree` and a multi-parent centering pass on top. |
| Speedruns | one `<canvas>`, Chart.js | One element, painted by JS. No off-screen children exist. The property is inert. |

So Part 2 is a **different problem with different candidates**, not an extension of Part 1. Do not
open it by adding a CSS property.

## The one lesson from Part 1 that does transfer

**Trace first. Do not assume.** Part 1 records that the React DevTools Profiler misled that
investigation three times: its "what caused this update" list names components that *scheduled*
updates, not components that were expensive. The Performance panel is what found the real cost.

Concretely, before writing any task for Part 2:

1. **Re-read the field data.** The numbers in *Field data* predate the Cardex fix. Confirm which
   route is now worst and whether these three are still only "Needs Improvement" (320 / 256 / 232 ms
   vs Cardex's 568 ms). `/speedruns` has **4 samples** — that is not a measurement, and its P75 may
   move a lot with more traffic. Do not optimise it on the strength of that number.
2. **Record a matched pair**, both runs unthrottled, back to back, per the method in *Lab data*.
   Part 1 shows dev-server traces are noisy enough that comparing across sessions is unreliable —
   its own recorded baseline and its re-measured one differed by 65% on Scripting.
3. **Expect the split to be Scripting-dominated**, the mirror image of Cardex. If a trace shows
   Rendering + Painting dominating on a tree, that contradicts the hypothesis below and is the
   interesting finding — follow the trace, not this section.

## Priority

**Lower than Part 1 was, and possibly not worth doing at all.** All three are "Needs Improvement",
not "Poor". Worth confirming the Cardex fix landed in the field before spending anything here.

## Candidates — Skilldex and Eventmaps (tree tools)

Both are the same architecture, so a finding on one likely applies to the other. `TalentTree`
memoizes a layout pass and feeds a D3 render effect that wipes and redraws the whole SVG
(`select(svgRef.current).selectAll('*').remove()`). That redraw is the suspected INP cost.

The interactions to trace are **expanding/collapsing a node**, **toggling a formatting filter**, and
**typing a keyword**. Candidates, in rough order of promise:

1. **Narrow what invalidates the layout memo.** `areChildrenExpanded` is in `TalentTree`'s layout
   memo deps, so expanding a single node re-runs `buildHierarchicalTreeFromTalentTree`, the collapse
   filter, `cacheAllNodeDimensions`, the `tree()` layout and the bounds pass for the **entire tree**,
   then redraws every node. Whether that is avoidable is the open question — the tidy layout genuinely
   depends on which nodes are present, so this may be irreducible rather than wasteful. Check what
   fraction of the interaction it actually is before designing around it.
2. **Redraw incrementally instead of wiping the SVG.** The render effect removes all children and
   rebuilds every node. A D3 general-update-pattern join (enter/update/exit) would touch only what
   changed. This is a **significant rewrite** of the render path and would need the same
   visual-verification treatment the codex invariants already demand — do not start here without a
   trace proving the redraw is the cost.
3. **Defer the redraw** (`useDeferredValue` / `startTransition`), so the checkbox or expand affordance
   paints before the tree does. Same honest trade as Part 1's Task 2: it moves the *measured*
   interaction without reducing work. Cheapest thing to try, and the one to try first if the trace
   confirms scripting dominates.

**Constraints that apply before touching either tree** — from `src/codex/CLAUDE.md`, and these are
the reason this work is harder than it looks:

- The **layout/render split is an invariant**: layout is memoized on tree/filter/formatting inputs,
  zoom only re-renders. *"Don't merge the layout and render effects back together, and don't add
  `zoomLevel` to either layout memo's deps"* — that separation is what keeps zooming off the
  dimension-caching path. A performance change that collapses it trades one interaction's cost for
  another's.
- **Zoom commits on drag end, not continuously** — already an INP-shaped optimisation, and a
  precedent worth copying rather than undoing.
- Node-dimension caches are keyed by all rendering settings; the event cache clears only on event
  change/unmount.
- **Tree changes are verified visually by the user** (expanded/collapsed nodes, zoom levels), not by
  tests. Budget for that: every candidate above changes rendering, so each needs a pause for visual
  comparison exactly as Part 1's tasks did.
- `utils/tree/` is **shared by both trees** — a fix there lands on Skilldex and Eventmaps at once,
  which is an argument for looking there first, and a reason to verify both after any change.

## Candidates — Speedruns (chart)

Chart.js on a canvas, so this is the most different of the three and shares nothing with the trees.

Two things are already in place and should be understood before changing anything: chart updates are
**debounced** (`CHART_UPDATE_DELAY = 200`) specifically to prevent flickering, and the hover/legend
path already uses `chartInstance.current.update('none')` to skip animation.

Candidates:

1. **Avoid destroying and recreating the chart instance.** A control change currently runs
   `chartInstance.current.destroy()` and constructs a `new ChartJS(...)`. Mutating `data.datasets`
   and calling `update()` is the cheaper path where the config has not structurally changed. Whether
   it can be done without regressing the flicker the debounce exists to prevent is the open question.
2. **Check whether the 200ms debounce is itself inflating INP.** INP measures to the next paint after
   the interaction; a deliberate 200ms delay before the chart redraws may be *counted*. If so, there
   is a real tension between flicker and the metric — resolve it in favour of how it feels to use,
   not the number, and record the decision.
3. **Interactions worth tracing**: changing class/difficulty/time controls, clicking a legend entry,
   hovering a data point.

Given **4 samples** in the field data, confirm this route has meaningful traffic before investing in
any of it.

## Which docs change with Part 2

Unknown until traced. Likely candidates:

- **`src/codex/CLAUDE.md`** — if the layout/render split or the dimension-cache keying changes, the
  invariants describing them change with it. A change that *contradicts* one gets raised with the
  user rather than quietly rewritten.
- **`src/codex/utils/eventTreeSpacing/README.md`** — if the event-tree layout passes change.
- **This file** — record the matched-pair measurements per tool the way Part 1 does, including the
  numbers that do not flatter the change.
- **Root `CLAUDE.md`** — PWA & Performance already carries a line pointing here and stating that
  Cardex is done and these three are not; update it when that stops being true.
