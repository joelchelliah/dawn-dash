# Spec: Skilldex juice (search feedback + tree motion)

Visual polish for Skilldex across its three interaction surfaces — typing keywords, watching the
tree redraw, and flipping formatting filters. Nothing here changes what data is shown or which
talents match; every task is about making an already-correct redraw _read_ as intentional motion
rather than a flash.

The list came out of a review of the whole Skilldex path (page → search panel → filter groups →
results panel → the four tree-rendering modules). Eighteen candidates were raised; the ten below
survived triage, and the rejections are recorded at the bottom so they don't get re-proposed.

## Why this is one spec rather than ten

Six of the ten tasks touch the same render effect in
[`TalentTree/index.tsx`](components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx), and four
of those depend on the **keyed node join** in Task 2. Splitting them would mean either doing that
refactor twice or landing motion tasks on top of an index-based join that silently animates the
wrong nodes. The search-panel tasks (1–3) are independent of the tree tasks and could ship
separately, but they share the spec because they're the same push.

## Decisions already made

Settled in discussion — do not re-litigate mid-implementation:

- **No hover-driven behaviour anywhere in the tree.** Nodes aren't clickable, so hover affordances
  imply an interaction that doesn't exist, and they're dead weight on mobile. This kills node hover
  states, ancestry-path highlighting on hover, and hover tooltips for full-size artwork. The
  existing hover on the _expansion button_ stays — that one is clickable.
- **Nothing new goes in the results panel chrome.** No tier legend, no per-filter blame in the
  empty state. The panel above the tree stays as it is.
- **No autocomplete on the search field.** The field searches names _and_ descriptions; suggesting
  talent names would push users toward name-only searching and misrepresent what the field does.
- **Keyword pills render _below_ the search field, not inside it**, as a read-only row over
  `parsedKeywords` with a working `×` per pill. Rendering them inside the input was considered at
  length and rejected: a token input can only pill the segments _before_ the caret, so the keyword
  the user is currently typing stays loose text even though it is already filtering — the row would
  permanently undercount by one, and a single-keyword search (the common case) would show no pills
  at all. Below the field, the row renders the parser's actual output, so the last pill live-updates
  as the user types and the row is an honest readout of what is filtering. This also removes the
  `or`-vs-comma tokenising asymmetry, all caret/focus/auto-grow mechanics, and the iOS
  reflow-under-keyboard risk. The one thing given up is backspace-to-un-pill, which is the only
  gesture that genuinely requires owning the input; `×` removal does not.
- **No tag-input package.** `react-tagsinput`, `@yaireo/tagify`, Downshift et al. all own a
  `tags: string[]` and would put a second source of truth beside the comma string in `useKeywords`,
  or force a rewrite of it plus its debounce and filter-cache persistence. They also ship their own
  CSS, against a codebase that styles via SCSS modules over a Sass design system. What they are
  worth their weight for — async suggestions, dropdown keyboard nav, ARIA combobox semantics — is
  exactly what this task does not need.
- **No result count under the search bar.** It was proposed as an alternative to the pills; a live
  pill row _is_ a readout of what is filtering, so a separate count is redundant. Dropped, not
  deferred.
- **No filter-group changes.** Per-option match counts, non-default badges, requirement-icon
  hover/desaturation, and textured requirement checkboxes are all out. The existing 0.5→1 text
  opacity is sufficient checked/unchecked signalling.
- **`d3-transition` gets added as a dependency** (Task 1). See the constraint below — there is no
  way to do Tasks 3, 4, 5 or 6 without it.

## Verified facts (checked 2026-08-06 — re-check before acting)

Checked against the working tree, not assumed. Two of these change the shape of the tasks:

- **`d3-transition` is not installed.** `package.json` has `d3-array`, `d3-flextree`,
  `d3-hierarchy`, `d3-selection` — no `d3-transition`, and it isn't pulled in transitively by
  anything in `node_modules`. `d3-selection`'s `.transition()` is a _monkey-patch_ that `d3-transition`
  installs onto `selection.prototype` when imported; without it, calling `.transition()` on any
  selection throws `TypeError: sel.transition is not a function`. Nothing in `src/` calls
  `.transition()` today, so this is a genuinely new dependency, not a missing import.
- **The node join is index-based.** The render effect does
  `.selectAll('.node').data(descendants).enter().append('g')` on an SVG that was just fully cleared
  with `selectAll('*').remove()`. There is no key function and no update selection — every redraw is
  a from-scratch build. Any transition that interpolates _from_ a previous position needs the join
  keyed by talent name and the clear-everything removed, which is Task 2.
- **`.node` is never actually applied as a class.** `.selectAll('.node')` matches nothing (the SVG
  was just emptied), and the appended `g` elements get no class. The selector works only because
  the enter selection is derived from the data, not the DOM. Task 2 has to add the class for a keyed
  re-select to work at all.
- **Links have no per-link identity either.** `drawLinks` joins
  `treeData.links().filter(...)` with no key, and colours each path with a flat `getLinkColor`
  stroke via `.style('stroke', ...)`.
- **The layout/render split is real and load-bearing.** `layout` is a `useMemo` over tree + filters
  (no `zoomLevel`); the render `useEffect` depends on `layout` _and_ `zoomLevel`. Zooming re-renders
  without recomputing layout or re-caching node dimensions. Every animated task must fire on
  `layout` changes only — animating on a zoom change would re-run entrance motion every time the
  slider commits.
- **Max tree depth is 4.** Confirmed against `maxDepth` usage in the render effect and the
  `requirement-node-label--depth-{2,3,4}` variants in the stylesheet. A depth-staggered entrance
  therefore has a bounded, short total duration.
- **Tier colours already exist as a Sass map**, `$tier-index-to-color-map` in
  [`src/styles/_colors.scss`](../styles/_colors.scss), consumed by `.talent-node`, `.talent-node-glow`,
  `.talent-node-separator` and `.talent-node-card-sets` via `@each`. Task 7 needs these values in
  _TypeScript_, which they currently are not — see that task.
- **Zoom commits on drag end, not continuously** (`ZoomSlider` tracks a local pending index). So a
  zoom-triggered re-render happens once per drag, not per step — but it still must not re-trigger
  entrance animations.
- **`SearchField` has three call sites, and one must not get pills.** Cardex
  (`CardSearchPanel`) and Skilldex (`TalentSearchPanel`) both render it with identical
  `keywords`/`setKeywords` props. The third is the **Eventmaps event list**
  (`EventResultsPanel/EventList`), which passes `mode="text"` with the placeholder _"Filter by any
  text occurring anywhere in the event"_ — that field is deliberately not comma-separated, so pills
  there would be wrong. Any pill row must be opt-in, and Cardex gets it too unless the call sites are
  differentiated. Confirm with the user whether Cardex is in scope before building.
- **The keyword separator is not just a comma.** `parseKeywords` in `useKeywords.ts` splits on
  `/,\s+or\s+|,\s*|\s+or\s+/`, so `"fire or ice"` is already **two** keywords with no comma typed.
  A pill row rendered from `parsedKeywords` gets this right for free; anything that re-derives
  segments by splitting on `,` alone would silently disagree with the filter.
- **`keywords` and `parsedKeywords` are different values, 150ms apart.** `keywords` updates per
  keystroke for input responsiveness; `parsedKeywords` is debounced so downstream filtering doesn't
  block the main thread. The pill row renders `parsedKeywords` — the same value the tree is filtered
  by — so the pills and the tree stay in agreement and both trail the raw input slightly. That is
  correct, not a bug to "fix" by reading `keywords` instead.

## How to work through this spec

### What to read first

- **Root [`CLAUDE.md`](../../CLAUDE.md)** — Working Style (progress cadence, `💡 [SUGGESTION]`
  prefix, and **the dev server is the user's to run**), the testing policy (no permanent tests;
  visual code is verified by manual before/after comparison), and the `npm run verify` requirement.
- **[`src/codex/CLAUDE.md`](CLAUDE.md)** — the whole Invariants section, but these four constrain
  this work directly:
  - **Layout/render split**: tree layout is memoized on tree/filter/formatting inputs; zoom only
    re-renders. Both tree components are `React.memo`'d and take scalar props. _Don't merge the
    layout and render effects, and don't add `zoomLevel` to either layout memo's deps._ Tasks 3–6
    all add motion to the render effect and must not violate this.
  - **Zoom commits on drag end, not continuously** — a full redraw per slider step would be
    wasteful. Animations must not make a committed zoom change look like a fresh tree build.
  - **Nil (0) expansion shows no card set at all in Skilldex**, and `shouldShowCardSet`
    (dimensions) must agree with `getCardSetName` (render) or nodes reserve height for a row they
    never draw. Task 6 animates section heights — it must keep those two in agreement.
  - **The name's layout ignores `WIDTH_SCALE` on purpose**, and positioning anything beside
    `.talent-node-name` requires _measuring_ the name (`talentTextMeasurer.ts` variants must stay in
    sync with the stylesheet's font sizes). Task A renders keyword pills in HTML, not SVG, so it
    dodges this — but don't be tempted to put the node-level keyword pills (Task B) into the SVG
    text flow.
  - **Talent artwork has no source above 70×70.** Relevant only as the reason the rejected
    hover-tooltip idea is rejected; don't revive it.
- **[`src/codex/utils/eventTreeSpacing/README.md`](utils/eventTreeSpacing/README.md)** — only if a
  task turns out to need shared tree infrastructure. The _event_ tree owns that directory; talent
  layout does not use `d3-flextree`. `utils/tree/` **is** shared by both trees — a change to
  `svgHelper.ts` (Task 1 may want one) affects Eventmaps too, so check the event tree visually if
  you touch it.

### Where to stop

**Every task pauses for confirmation. Do not chain.**

This is motion work on a shared SVG renderer, and it's the worst possible case for chaining: a
stagger that's 80ms too slow, an easing curve that overshoots, or a transition that fires on zoom
instead of layout all look "basically fine" in isolation and become impossible to attribute once
three more animations are layered on top. Task 2 in particular rewrites the join that Tasks 4, 5,
6 and 7 build on — a mistake there surfaces as _other_ tasks misbehaving.

For each task: finish it, run `npm run verify`, mark it **COMPLETED** in this spec, then say what
changed and name the specific states to look at, and wait. The user starts the dev server.

**Tasks with no visible effect of their own** — don't mistake these for broken steps:

- **Task 1** (add `d3-transition`, wire the animation gate) renders identically to `main` by design.
  Its only observable effect is that `npm run verify` and `npm run build` still pass. Verify by
  confirming the tree still draws and zoom still works — _nothing should move yet_.
- **Task 2** (keyed node join) is a refactor. The tree must look pixel-identical to before at every
  zoom level and in every expand/collapse state. If anything moves or flickers after Task 2, that's
  a bug in Task 2, not a preview of Task 3.

### How it gets verified

`npm run verify` after every task — required, non-negotiable. No task here touches `pages/`,
`next.config.ts`, or a data hook, so `npm run build` is not required; run it anyway after Task 1
since that one changes `package.json`. `npm run check-sw` is not relevant.

Then **visually, in the user's dev server**, on `/skilldex`. For every tree task, compare these
states — "looks fine" on one of them routinely misses the others:

- **Cover zoom vs a numbered zoom stop.** Cover uses a `viewBox`; numbered stops use explicit
  scaled pixel dimensions with a `scale()` on the content group. A transition tuned at Cover can
  visibly stutter when scaled, and a stagger must not re-fire when the zoom slider commits.
- **Expanded vs collapsed**, both via the _Expand all nodes_ formatting filter and via individual
  `+`/`−` buttons on a node with several children.
- **A small tree and a deep one.** Search a single narrow keyword for a shallow result, then use
  _Show all talents matching only the filters_ for the full-depth case (max depth 4). Total
  entrance duration must stay short enough not to feel like a loading state.
- **Every formatting-filter combination that changes node height**: _Show talent art_, _Show talent
  description_, _Show card set_, _Show matching keywords_, _Show Blightbane link_. Toggle each
  individually **and** with description off — the collapsed-name font variants and the
  name-row-is-the-whole-node corner-rounding case only appear there.
- **Mobile and desktop.** Mobile has no visible scrollbar, `max-height: 100%` on the scroll wrapper,
  and the sticky zoom on the left instead of the right. Animation that reads as smooth on a desktop
  GPU can stutter on mobile Safari — check the entrance stagger and the height transitions there
  specifically.
- **`prefers-reduced-motion`.** Every task that adds motion must respect it (see Task 1). Verify by
  toggling the OS setting, or via DevTools rendering emulation, and confirming the tree still draws
  correctly with no animation.

### Which docs change with the work

Grepped, not guessed:

- **[`src/codex/CLAUDE.md`](CLAUDE.md), Invariants** — the _Layout/render split_ bullet currently
  says zoom "only re-renders". After Task 1 it needs a clause on the animation gate: renders
  triggered by a `zoomLevel` change must **not** animate, only `layout`-triggered ones do. That's a
  new invariant with no type-level enforcement, so it belongs there.
- **[`src/codex/CLAUDE.md`](CLAUDE.md), Key files** — after Task 2 the node join is keyed by talent
  name. Worth a line, because it's what makes name uniqueness within a rendered tree load-bearing;
  duplicate names in one tree would collapse into one node.
- **Root [`CLAUDE.md`](../../CLAUDE.md), Data Layer / Styling Conventions** — untouched. No data
  source, cache, or store changes here.
- **Root [`CLAUDE.md`](../../CLAUDE.md)** has no dependency list, so adding `d3-transition` doesn't
  invalidate it. Do not add one.
- **New invariant to record once Task 7 lands**: `$tier-index-to-color-map` (Sass) and the
  TypeScript tier-colour source Task 7 may introduce must stay in sync. Nothing type-checks it — same
  class of hazard as `NODE.CORNER_RADIUS` vs `.talent-node`'s `rx`/`ry`, and it gets the same
  treatment: a comment on both sides.

**If a task turns out to contradict a documented invariant, raise it with the user rather than
quietly rewriting the invariant.** The layout/render split and the `shouldShowCardSet`/
`getCardSetName` agreement are the two most likely to come under pressure here.

### Comment style

The non-obvious _why_, in a line or two. For this spec that mostly means: why a transition is gated
the way it is, why a duration or easing was chosen if it isn't arbitrary, and why the join is keyed
by name. Don't restate what the code does and don't narrate that something used to be index-based.

---

## Tasks

**Ordered operationally — this is the sequence to build in.** The order is a dependency order, not a
topical one, and two places in it are load-bearing:

- **Tasks 1 and 2 come first because they have no visible effect.** They are the transition
  machinery and the keyed join that Tasks 3, 4, 5, 6 and 7 all build on. Building any animated task
  before them means either a throwaway implementation or animating a node join that can't
  interpolate.
- **Task 5 (expand/collapse) comes before Task 6 (formatting-filter heights)**, which looks backwards
  by size — Task 5 is the larger. It's deliberate: Task 5 builds the old-layout-in-a-ref plus
  link-interpolation machinery that Task 6's good version needs, so doing them in this order makes
  Task 6 nearly free. Reversed, Task 6 gets built cheaply and then rebuilt.

**Tasks A and B (the search-panel pills) are an independent block** — they share no code with the
tree tasks and can be done before, after, or between them. Task B depends on Task A only for its
pill design, not for its code.

### Task 1 — Add `d3-transition` and the animation gate — STATUS: TODO

**No visible change. This is infrastructure for Tasks 3, 4, 5 and 6.**

1. `npm install d3-transition` + `@types/d3-transition`. Import it once for its
   `selection.prototype` side effect — `import 'd3-transition'` in the tree module. Without the
   import, `.transition()` throws.
2. Build the gate that decides whether a given render animates. The render effect fires on both
   `layout` changes (new tree — should animate) and `zoomLevel` changes (same tree, redrawn at a new
   scale — must **not** animate). A ref holding the last-seen `layout` reference is enough: animate
   when it differs, skip when it doesn't.
3. Respect `prefers-reduced-motion` in the same gate — one check, so no later task has to remember.
   Use `window.matchMedia('(prefers-reduced-motion: reduce)')`; when set, every task's animation
   must degrade to the final state applied immediately, not to a broken intermediate.

**Watch for**: the gate must not become a fifth boolean prop threaded through the render helpers.
Keep it local to the render effect and pass a single `shouldAnimate` down.

**Verify**: tree draws identically to `main`; zoom slider works; `npm run verify` and
`npm run build` pass. Nothing moves.

### Task 2 — Key the node join by talent name — STATUS: TODO

**No visible change. This is a refactor, and Tasks 3, 4, 5, 6 and 7 depend on it.**

The render effect currently clears the SVG entirely and rebuilds from the data with an unkeyed
`.enter()`. Nothing can interpolate _from_ a previous position because no previous element survives.

- Give the appended node groups the `.node` class they're currently selected by but never assigned.
- Key the join by talent name (`.data(nodes, d => d.data.name)`) so D3 matches a node across
  redraws, and handle enter/update/exit as three selections instead of one enter.
- Do the same for the link join — key by `source.data.name + '→' + target.data.name`.
- Stop calling `selectAll('*').remove()` on every render. `defs` still need clearing or ids
  accumulate; keep that explicit rather than nuking the whole subtree.

**Watch for**:

- **Name uniqueness within one rendered tree becomes load-bearing.** Two nodes with the same talent
  name in a single tree would collapse into one. Check whether the tree builder can produce that
  (a talent reachable via two requirement roots) before assuming it can't — if it can, key on
  something that includes the path, and record it as an invariant.
- The `defs`-scoped ids (`talent-artwork-clip-{name}`, `talent-artwork-mask-{name}`,
  `talent-artwork-fade-{name}`, `requirement-clip-{i}-{j}`, `circle-clip-{i}-{j}`) are currently
  regenerated wholesale. The artwork ones are name-derived and survive a keyed update fine; the
  requirement ones are **index**-derived and will collide or go stale if elements persist across
  renders. Make them name-derived too, or clear and rebuild them deliberately.
- The expansion-button pass runs as a second `nodes.each(...)` after the main render. With an
  update selection it will re-append buttons onto nodes that already have one. Handle it.

**Verify**: pixel-identical to before, at Cover and a numbered stop, expanded and collapsed, with
every formatting filter on and off. Compare with the SVG inspected in DevTools — confirm no
duplicate `<g class="node">` per talent and no growing `<defs>` after several redraws.

### Task 3 — Mask the redraw with a fade — STATUS: TODO

**Depends on Task 1** (for the gate). This is the smallest change that addresses the complaint
behind the whole spec — the redraw reads as a choppy flash.

Today `setKeywords` flows through to the filter, the layout memo recomputes, and the render effect
rebuilds from scratch. The tree pops.

Fade the content group out and back in around the rebuild, so the perceived cost of the redraw lands
on an intentional transition rather than a frame drop. A short opacity dip (~120–150ms) on the
content group, fired only when Task 1's `shouldAnimate` gate is true.

**Deliberately left to trial and error in the browser**: the exact duration, and whether the dip
should be opacity-only or opacity + a 2–3px vertical drift. Start with opacity-only at 140ms. Too
long and typing feels laggy — the opposite of the goal, so err short.

**Watch for**: use Task 1's gate rather than building a second one. A zoom commit re-runs the render
effect, and a fade there would make every slider release blink.

**Verify**: type a keyword one character at a time and watch for choppiness; then drag the zoom
slider and confirm **no** fade on release.

### Task 4 — Staggered entrance by depth — STATUS: TODO

**Depends on Tasks 1 and 2.** The simplest consumer of the new transition machinery — a good
confidence check on it before Task 5.

Fade + slide each node in on first render, delayed by `depth * ~60ms`, so the tree unfolds
left-to-right along its dependency direction. Slide from the parent's position, not from a fixed
offset — that's what makes it read as growth rather than a generic fade-in.

Max depth is 4, so worst-case total is ~240ms of stagger plus the per-node duration — short enough
not to feel like loading.

**Deliberately left to trial and error**: the per-depth delay and the per-node duration, and whether
links animate with their target node or draw in first. Start at 60ms/depth.

**Watch for**: fires only when `shouldAnimate` is true. Must not re-run on zoom commits, on a
formatting-filter toggle (Task 6 owns that motion), or on an expand/collapse (Task 5 owns that).

**Verify**: a fresh search from empty; then a zoom drag and a formatting toggle — neither should
re-stagger. Check mobile for stutter.

### Task 5 — Animate expand/collapse — STATUS: TODO

**Depends on Tasks 1 and 2. The highest-value task here and the largest.** It comes before Task 6
because it builds the machinery Task 6 reuses — see the ordering note at the top of this section.

Toggling a node re-runs the layout and the tree jumps; nodes far from the click move hundreds of
pixels with no visual connection to where they were. Transition node `transform` and link `d` over
~300ms so the tree rearranges instead of teleporting.

This is the standard d3-tree treatment and it needs:

- The **previous** layout retained across the memo recompute, so entering nodes can start at their
  parent's old position and exiting nodes can collapse toward it.
- Link paths interpolated between old and new `d`. Note that `generateLinkPath` derives endpoints
  from each node's _half-width_, which itself depends on the formatting filters — so an interpolated
  path has to recompute endpoints, not just tween the string.
- Exiting nodes fading and shrinking toward the collapsing parent before removal.

**Deliberately left to trial and error**: duration and easing. ~300ms with a standard ease-out is
the starting point; anything past ~400ms will feel sluggish on repeated toggles.

**Watch for**: rapid repeated clicking on the same `+`/`−`. Transitions must be interruptible —
D3 cancels a running transition on the same element by name, so name them rather than relying on
default behaviour. Also confirm the layout memo isn't being made to hold the old layout in a way
that adds `zoomLevel` to its deps; **the previous layout belongs in a ref**, or the layout/render
split invariant is broken.

**Verify**: expand and collapse a node with several children, near the root and at depth 4; the
_Expand all nodes_ filter (which changes many nodes at once); rapid repeated toggling; both zoom
modes; mobile.

### Task 6 — Animate formatting-filter height changes — STATUS: TODO

**Depends on Tasks 1, 2 and 5.** With Task 5 done, this is mostly a second trigger for machinery
that already exists.

_Show description_ and _Show talent art_ are the toggles users flip most while browsing, and both
resize every node instantly. Transition the affected sections' height and opacity, and the node
rect's height along with them.

**This is the task most likely to hit an invariant.** The `shouldShowCardSet` (dimension) /
`getCardSetName` (render) agreement, and the shared `getNameRowHeight` used by both the dimension
engine and the renderer, exist precisely because the height budget is computed in one place and
drawn in another. An animation that interpolates the _drawn_ height while the _reserved_ height
jumps will show up as overlapping nodes mid-transition.

Reuse Task 5's old-layout ref to interpolate each node's `transform` from its old to its new
position alongside the content, so the whole tree reflows smoothly rather than jumping while only
the section contents fade.

**Fallback if that proves fiddly**: reserve the final height immediately (nodes jump as they do
today) and animate only the section contents' opacity/height inside each node. Cheaper and it can't
desync the layout, but it looks half-finished next to Task 5 — treat it as a retreat, not the plan.

**Verify**: toggle each formatting filter individually and in combination, with description both on
and off; watch for any frame where two nodes overlap. Both zoom modes, mobile and desktop.

### Task 7 — Tier-gradient links — STATUS: TODO

**Depends on Task 2** (which keys the link join). Independent of the motion tasks — good filler
between the heavy ones.

Links draw with a flat `getLinkColor` stroke. Give each a `<linearGradient>` interpolating source
tier colour → target tier colour, so every edge shows tier progression.

**The blocker is that tier colours are Sass-only.** `$tier-index-to-color-map` lives in
`src/styles/_colors.scss` and reaches the SVG exclusively through `@each`-generated CSS classes —
there is no TypeScript source for the hex values, and a gradient needs them as `stop-color`
attributes. Options, in preference order:

1. Keep it in CSS. Define the gradients as CSS custom properties on the tier classes and reference
   them from the stroke, so Sass stays the single source. Check browser support for the exact form
   used before committing — this is the clean option only if it actually works.
2. Add a TypeScript tier-colour constant mirroring the Sass map, with a comment on **both** sides
   saying they must stay in sync. This is a real duplication hazard of the same kind as
   `NODE.CORNER_RADIUS` vs `.talent-node`'s `rx`. If it's the chosen route, record the pairing in
   `src/codex/CLAUDE.md`.

**Do not** read computed styles off a temporary DOM element to recover the hex values at runtime.

**Watch for**: one `<defs>` gradient per link. With a large tree that's hundreds of gradient nodes —
check it doesn't measurably slow the redraw, and that the ids are keyed consistently with Task 2's
link keys so they don't accumulate.

**Verify**: a tree spanning several tiers at both zoom modes; confirm link colours still read as
distinct from the requirement-indicator circles that sit on top of them.

### Task 8 — Descendant count on the expansion button — STATUS: TODO

**Independent of everything else** — no dependency on Tasks 1–7. Good one to slot in if a pause is
needed between the big motion tasks.

The `+` button looks the same whether it's hiding 1 child or 15. Show the count of **immediate
hidden children** in the button — `+7` — so depth is visible before clicking.

`renderExpansionButton` already has `talentNodeInFullTree.children` in hand, so the count is
`children.length` filtered the same way the render filters them. Immediate children only, not the
full subtree — that was the explicit preference.

**Watch for**: `EXPANSION_BUTTON.RADIUS` is 14 and the text is `font-size('md')` weight 800. `+7`
fits; `+15` may not. Either scale the radius with the digit count or drop the font size for
two-digit values — decide by looking at the widest real case. The `−` (expanded) state has no count
and keeps its current size, which means the button changes width on toggle; check that reads as
deliberate.

**Verify**: a node with a single hidden child, one with ~7, and the widest case in the data; both
zoom modes; expanded and collapsed states side by side.

### Task A — Keyword pills below the search field — STATUS: TODO

**Independent of Tasks 1–8.** Search-panel work, no tree code involved.

A row of removable pills directly under the search input, replacing the plain `[ a, b, c ]` text
that `KeywordsSummary` currently renders above the tree.

**Render from `parsedKeywords`, not from splitting `keywords` yourself.** That is the whole point of
the below-the-field placement: the parser already handles both `,` and `or` separators, so its
output is the authoritative list of what is filtering. Re-deriving segments would drift from the
filter (see the separator note in Verified facts). It also means the last keyword pills like every
other one and updates live as the user types — the asymmetry that ruled out an in-field token input.

`KeywordsSummary` already computes `fullMatch` per keyword (an exact name match against the result
set) and styles it with `--full-match`. Reuse that signal rather than recomputing it.

- Each pill gets an `×` that removes **just that keyword**, so dropping one term doesn't mean
  editing the raw string. Removal writes back through `setKeywords` — rebuild the comma string from
  `parsedKeywords` minus the removed index. Note this **normalises** the string: an `or` separator
  comes back as `, `, and stray whitespace is lost. That's acceptable (the parse result is
  identical), but it means the input's text can change under the user on a pill removal — confirm
  that reads as expected rather than as the field being rewritten.
- **Match vs no-match differentiation is a trial-and-error item, not a decision.** Build it behind a
  single style so it can be switched off after looking at it. The concern is that dimming or
  striking a no-match pill reads as an error when it's the normal mid-typing state. Show the user
  both before settling.
- **Scope question to resolve before building**: `SearchField` is shared with Cardex, which passes
  identical props, so the pills land there too unless the call sites are differentiated. Ask.
  Eventmaps' `mode="text"` field must be excluded either way.

**Deliberately left to trial and error**: whether the row sits flush under the input (shared border,
no gap, reading as one control) or as a clearly separate row below it. Try flush first — it gets
most of the visual benefit of an in-field token input with none of the input mechanics.

**Watch for**: the row appears and disappears as keywords come and go, which reflows everything
below it in the search panel. Give it a stable min-height, or the filter groups jump on the first
keystroke. On mobile the panel is `flex: 1 0 100%` and the row will wrap sooner — check two and
three-line cases.

**Verify**: a keyword matching a talent name exactly, one hitting only descriptions, and one
matching nothing; a `fire or ice` search (must show two pills, no comma typed); removing the middle
pill of three; removing the only pill; mobile with enough keywords to wrap. Confirm the pills and
the tree always agree — both trail the raw input by the 150ms debounce, which is correct.

### Task B — The same pills on the tree nodes — STATUS: TODO

**A separate pause from Task A** — it's SVG rather than HTML, so it's a different implementation
with a different failure mode, and it's only worth doing once Task A's pill design is settled.

When _Show matching keywords_ is enabled, the tree draws matching keywords as an italic SVG `text`
line under the node (`renderKeywords`). Render them as the same pill shape as Task A, for
consistency.

**Constraints, both load-bearing:**

- Node keyword rendering lives inside the dimension engine's height budget
  (`NODE.KEYWORDS.HEIGHT`, `TOP_MARGIN`, `BOTTOM_MARGIN`). Pills are taller than a text line, so
  `talentNodeDimensions.ts` must be updated in the same change or nodes will overlap — the
  reserved height and the drawn height have to agree, the same hazard the card-set invariant
  describes.
- **Do not use a `foreignObject`.** The description's `transform: translateZ(0)` workarounds in the
  stylesheet exist because of what `foreignObject` costs on mobile. Draw `rect` + `text` pairs, and
  measure the text with `talentTextMeasurer.ts` rather than guessing pill widths — SVG `text` with
  `text-anchor: middle` reports no width, which is exactly how the first artwork attempt broke.

**Verify**: _Show matching keywords_ on, with descriptions both on and off, at Cover and a numbered
zoom stop, on mobile; a node matching one keyword and a node matching several; confirm no node
overlap in any formatting-filter combination.

---

## Rejected — do not re-propose

Recorded with the reason so a fresh context doesn't resurface them:

| Idea                                                      | Why not                                                                                                                                                                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Talent-name autocomplete in the search field              | The field searches descriptions too; name suggestions would misrepresent it and narrow how people search.                                                                                                                         |
| Pills _inside_ the search field (token input)             | Can only pill segments before the caret, so the keyword being typed stays loose text while already filtering — the row undercounts by one and a single-keyword search shows no pills. See the decision in Decisions already made. |
| A tag-input package (`react-tagsinput`, Tagify, …)        | All own a `tags: string[]`, duplicating or displacing the comma string in `useKeywords`; they ship their own CSS; and what they're worth their weight for (suggestions, dropdown nav, ARIA combobox) isn't needed.                |
| Live result count under the search bar                    | A live pill row already reads as what is filtering, so a separate count is redundant. Dropped outright.                                                                                                                           |
| Node hover state (glow lift, border brighten)             | Nodes aren't clickable — a hover affordance implies an interaction that doesn't exist. Useless on mobile.                                                                                                                         |
| Ancestry-path highlight on node hover                     | Same hover objection, and the trees aren't deep enough (max depth 4) for path-tracing to earn its keep.                                                                                                                           |
| Hover tooltip with full 70×70 uncropped art               | Same hover objection.                                                                                                                                                                                                             |
| Tier legend above the tree                                | Too much chrome in the results panel.                                                                                                                                                                                             |
| Per-option match counts on filter checkboxes              | Not wanted.                                                                                                                                                                                                                       |
| "Non-default filter" badges / conditional Reset state     | Not wanted.                                                                                                                                                                                                                       |
| Requirement-icon hover growth + desaturate-when-unchecked | The existing 0.5→1 text opacity is sufficient signalling.                                                                                                                                                                         |
| `rainTexture` on Card Set / requirement checkboxes        | Not wanted.                                                                                                                                                                                                                       |
| Empty state naming the blocking filter                    | Not wanted.                                                                                                                                                                                                                       |
