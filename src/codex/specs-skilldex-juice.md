# Spec: Skilldex juice (search pills + per-node appearance)

Two pieces of visual polish for Skilldex, independent of each other:

1. **Keyword pills** below the search field — a live, removable readout of what is actually being
   filtered on, replacing the plain `[ a, b, c ]` text currently rendered above the tree.
2. **A per-node appearance animation** — each talent node stretches out of a slightly squished state
   and fades up from a lower opacity as it is drawn.

Nothing here changes what data is shown or which talents match.

## Decisions already made

Settled in discussion — do not re-litigate mid-implementation:

- **No tree-wide animation of any kind.** No staggering by depth, no unfolding, no coordinated
  sequence of nodes/links/indicators, no motion tied to the tree as a whole. Task 3 animates each
  node **individually and independently**, with no knowledge of its neighbours, its depth, or what
  else is on screen. That independence is the point: it cannot look inconsistent between branches or
  get out of sync with anything, because there is nothing to sync with.
- **No `d3-transition`, and no new animation dependency.** Task 3 is CSS only. Every node is drawn
  fresh on each render, so a CSS `animation` on the node's class plays on its own — no JS timing, no
  transition bookkeeping, no interruption handling.
- **No animation on links, requirement indicators, or the tree container.** Only the talent nodes.
- **No hover-driven behaviour anywhere in the tree.** Nodes aren't clickable, so hover affordances
  imply an interaction that doesn't exist, and they're dead weight on mobile. This rules out node
  hover states, ancestry-path highlighting, and hover tooltips. The existing hover on the _expansion
  button_ stays — that one is clickable.
- **Nothing new goes in the results panel chrome.** No tier legend, no per-filter blame in the empty
  state. The panel above the tree stays as it is.
- **No autocomplete on the search field.** The field searches names _and_ descriptions; suggesting
  talent names would push users toward name-only searching and misrepresent what the field does.
- **Keyword pills render _below_ the search field, not inside it.** A token input can only pill the
  segments _before_ the caret, so the keyword being typed stays loose text even though it is already
  filtering — the row would permanently undercount by one, and a single-keyword search (the common
  case) would show no pills at all. Below the field, the row renders the parser's actual output, so
  the last pill live-updates as the user types. This also avoids all caret/focus/auto-grow mechanics
  and the iOS reflow-under-keyboard risk. The one thing given up is backspace-to-un-pill, which is
  the only gesture that genuinely requires owning the input; `×` removal does not.
- **No tag-input package.** `react-tagsinput`, `@yaireo/tagify`, Downshift et al. all own a
  `tags: string[]`, which would put a second source of truth beside the comma string in
  `useKeywords` or force a rewrite of it plus its debounce and filter-cache persistence. They also
  ship their own CSS, against a codebase that styles via SCSS modules over a Sass design system. What
  they are worth their weight for — async suggestions, dropdown keyboard nav, ARIA combobox
  semantics — is exactly what this does not need.
- **No result count under the search bar.** A live pill row already reads as what is filtering, so a
  separate count is redundant.
- **No filter-group changes.** Per-option match counts, non-default badges, requirement-icon
  hover/desaturation, and textured requirement checkboxes are all out. The existing 0.5→1 text
  opacity is sufficient checked/unchecked signalling.

## Verified facts (checked 2026-08-07 — re-check before acting)

Checked against the code, not assumed. Several of these change the shape of a task.

- **`SearchField` has three call sites, and one must not get pills.** Cardex (`CardSearchPanel`) and
  Skilldex (`TalentSearchPanel`) both render it with identical `keywords`/`setKeywords` props. The
  third is the **Eventmaps event list** (`EventResultsPanel/EventList`), which passes `mode="text"`
  with the placeholder _"Filter by any text occurring anywhere in the event"_ — that field is
  deliberately not comma-separated, so pills there would be wrong. Any pill row must be opt-in, and
  **Cardex gets it too unless the call sites are differentiated** — confirm whether Cardex is in
  scope before building.
- **The keyword separator is not just a comma.** `parseKeywords` in `useKeywords.ts` splits on
  `/,\s+or\s+|,\s*|\s+or\s+/`, so `"fire or ice"` is already **two** keywords with no comma typed. A
  pill row rendered from `parsedKeywords` gets this right for free; anything that re-derives segments
  by splitting on `,` alone would silently disagree with the filter.
- **`keywords` and `parsedKeywords` are different values, 150ms apart.** `keywords` updates per
  keystroke for input responsiveness; `parsedKeywords` is debounced so downstream filtering doesn't
  block the main thread. The pill row renders `parsedKeywords` — the same value the tree is filtered
  by — so the pills and the tree stay in agreement and both trail the raw input slightly. That is
  correct, not a bug to "fix" by reading `keywords` instead.
- **`KeywordsSummary` already computes the full-match signal.** It flags a keyword that exactly
  matches a result name and styles it with `--full-match`. Reuse that rather than recomputing.
- **Every talent node is drawn from scratch on each render.** The render effect clears the SVG
  (`selectAll('*').remove()`) and appends nodes via an unkeyed `.enter()`. No element survives a
  redraw — which is exactly why a CSS animation keyed to the node's class replays correctly with no
  JS involvement.
- **Node content is SVG, and the node is a `<g>` containing a `<rect>` plus text/image children.**
  Task 3's squish therefore has to be considered against `transform-box` / `transform-origin`: SVG
  elements default to a `transform-origin` at the SVG user-space origin, not the element's own
  centre, so a naive `scaleY` will fling nodes across the canvas. See Task 3.
- **The node's `<g>` already carries a `translate(...)` transform** for its layout position. A CSS
  `transform` on the same element **replaces** that translate rather than composing with it. This is
  the main trap in Task 3 — see its notes for the two ways out.
- **`src/styles/_animations.scss` already has a `fadeIn` keyframe and a `fadeInAnimation` mixin**, and
  `tinyPop`/`tinySqueeze` keyframes. The fade mixin hardcodes a 1s duration and 0.2s delay, so it is
  likely too slow to reuse directly, but the file is where any new keyframes belong.

## How to work through this spec

### What to read first

- **Root [`CLAUDE.md`](../../CLAUDE.md)** — Working Style (progress cadence, the `💡 [SUGGESTION]`
  prefix, and **the dev server is the user's to run**), the testing policy (no permanent tests;
  visual code is verified by manual before/after comparison), and the `npm run verify` requirement.
- **[`src/codex/CLAUDE.md`](CLAUDE.md)** — the whole Invariants section. These constrain this work
  directly:
  - **Layout/render split**: tree layout is memoized on tree/filter/formatting inputs; zoom only
    re-renders. Both tree components are `React.memo`'d and take scalar props. _Don't merge the
    layout and render effects, and don't add `zoomLevel` to either layout memo's deps._ Task 3 must
    not touch either — a CSS-only animation doesn't, which is part of why it's the chosen approach.
  - **Nil (0) expansion shows no card set at all in Skilldex**, and `shouldShowCardSet` (dimensions)
    must agree with `getCardSetName` (render) or nodes reserve height for a row they never draw.
    Task 2 changes what a node draws, so it must keep those two in agreement.
  - **Positioning anything beside `.talent-node-name` requires _measuring_ the name.** It's SVG
    `text` with `text-anchor: middle`, so D3 reports no width and a guessed offset silently overlaps
    the glyphs. `talentTextMeasurer.ts` has variants matching the name's three font states, and
    **those must stay in sync with `.talent-node-name`'s font sizes and weight in the stylesheet.**
  - **Talent artwork has no source above 70×70** — relevant only as a reason not to scale artwork up.
- **[`src/styles/_animations.scss`](../styles/_animations.scss)** before writing any keyframes — it is
  the shared home for them and already has close relatives of what Task 3 needs.

### Where to stop

**Every task pauses for confirmation. Do not chain.** Task 3 in particular is judged entirely by eye,
and tuning it is a conversation rather than a spec item — get it on screen at a first guess and expect
to iterate on the numbers.

For each task: finish it, run `npm run verify`, mark it **COMPLETED** in this spec, then say what
changed and name the specific states to look at, and wait. The user starts the dev server.

### How it gets verified

`npm run verify` after every task — required. No task here touches `pages/`, `next.config.ts`, or a
data hook, so `npm run build` is not required. `npm run check-sw` is not relevant.

Then **visually, in the user's dev server**, on `/skilldex`:

- **Tasks 1 and 2 (pills)**: a keyword matching a talent name exactly, one hitting only descriptions,
  and one matching nothing; a `fire or ice` search (must show **two** pills with no comma typed);
  removing the middle pill of three; removing the only pill; enough keywords to wrap onto two and
  three lines on mobile.
- **Task 3 (node animation)**: a single-keyword search returning a handful of nodes, and _Show all
  talents matching only the filters_ for the ~500-node case — the second is where a per-node
  animation can become expensive. Compare **Cover zoom against a numbered zoom stop**: Cover uses a
  `viewBox` while numbered stops use explicit scaled pixel dimensions with a `scale()` on the content
  group, and a transform-based animation can behave differently under each. Check **every formatting
  filter** (_Show talent art_, _description_, _card set_, _matching keywords_, _Blightbane link_)
  individually and with description off, since node height and content vary. Then **mobile**, where
  transform animations on hundreds of SVG groups are most likely to stutter.
- **`prefers-reduced-motion`**: Task 3 must respect it. With a CSS animation this is a media query in
  the stylesheet, not JS.

### Which docs change with the work

- **[`src/codex/CLAUDE.md`](CLAUDE.md), Invariants** — add one line once Task 3 lands, recording that
  the node's `<g>` carries both a layout `translate` and an appearance animation, and how they are
  kept from clobbering each other. Nothing type-checks that pairing.
- **[`src/codex/CLAUDE.md`](CLAUDE.md), Key files** — mention the pill row component once Task 1
  lands, if it becomes a shared component rather than living in the search panel.
- Root [`CLAUDE.md`](../../CLAUDE.md) — untouched. No data source, cache, store, or dependency changes
  here.

**If a task turns out to contradict a documented invariant, raise it with the user rather than quietly
rewriting the invariant.**

### Comment style

The non-obvious _why_, in a line or two. Here that mostly means: why the pill row reads
`parsedKeywords` rather than `keywords`, and why the node animation is structured to avoid clobbering
the layout transform. Don't restate what the code does.

---

## Tasks

Task 1 and Task 2 are the pill work and are independent of Task 3; either block can go first.

### Task 1 — Keyword pills below the search field — STATUS: COMPLETED

**As built**: a shared `SearchPanels/shared/KeywordPills` component, rendered by `SearchField` when
it is given `parsedKeywords`. The pills are **opt-in via props rather than the `mode` flag** —
Eventmaps passes neither `parsedKeywords` nor `matches`, so it is untouched without needing to know
pills exist. Both Cardex and Skilldex pass them, per the decision that both get pills.

`matchingTalentNames` moved from `TalentResultsPanel` into `useAllTalentSearchFilters`: the search
panel needs the same value to mark full-match pills, and one traversal serves both panels. Cardex
already exposed `matchingCards`, so its panel memoizes the name extraction (the set can run to
thousands of cards).

**The pills render in both places.** `KeywordsSummary`'s plain `[ a, b, c ]` text (and its
`.keywords-summary` styles) is replaced by the same component in a **read-only** variant, so the
"Found 4 talents matching:" line still lists what matched. Read-only is signalled by omitting
`setKeywords` — no `×`, transparent background, muted colour, since the editable copy already sits
next to the input the user typed into. `reserveSpaceWhenEmpty` is likewise opt-in and set only by the
search panel: reserving height stops the filter groups jumping on the first keystroke, but in the
results panel the row should simply not be there when there are no keywords.

A row of removable pills directly under the search input, replacing the plain `[ a, b, c ]` text that
`KeywordsSummary` currently renders above the tree.

**Render from `parsedKeywords`, not from splitting `keywords` yourself.** The parser already handles
both `,` and `or` separators, so its output is the authoritative list of what is filtering. Re-deriving
segments would drift from the filter. It also means the keyword currently being typed pills like every
other one and updates live.

- Each pill gets an `×` that removes **just that keyword**. Removal writes back through `setKeywords`
  — rebuild the comma string from `parsedKeywords` minus the removed index. Note this **normalises**
  the string: an `or` separator comes back as `, ` and stray whitespace is lost. The parse result is
  identical, so this is acceptable, but the text in the input visibly changes on a pill removal —
  confirm that reads as expected rather than as the field being rewritten.
- Reuse `KeywordsSummary`'s existing full-match signal for styling. **Whether matched and unmatched
  pills should look different is a trial-and-error item, not a decision** — build it behind a single
  style so it can be switched off after looking at it. The concern is that dimming or striking an
  unmatched pill reads as an error when it is the normal mid-typing state. Show the user both.
- **Resolve before building**: `SearchField` is shared with Cardex, which passes identical props, so
  the pills land there too unless the call sites are differentiated. Ask. Eventmaps' `mode="text"`
  field must be excluded either way.

**Deliberately left to trial and error**: whether the row sits flush under the input (shared border,
no gap, reading as one control) or as a clearly separate row below it. Try flush first.

**Watch for**: the row appears and disappears as keywords come and go, reflowing everything below it
in the search panel. Give it a stable min-height, or the filter groups jump on the first keystroke. On
mobile the panel is `flex: 1 0 100%`, so the row wraps sooner.

### Task 2 — The same pills on the tree nodes — STATUS: COMPLETED

**As built**: `renderKeywords` in `talentNodes.ts` draws `rect` + `text` pairs, no `foreignObject`.
Pill widths come from `measureTalentTextWidth` (the `default` 12px variant, matching the pill text's
font size). New dials live under `NODE.KEYWORDS` in `constants/talentTreeValues.ts`.

`getMatchingKeywordsText` became **`getMatchingKeywords`**, returning the array rather than a
pre-formatted `{ a, b }` string. Both dimension-engine call sites only tested `.length > 0`, so they
were unaffected beyond the rename.

**The height budget stays in agreement** because the reserved height (`talentNodeDimensions.ts`) and
the drawn row both read the same `NODE.KEYWORDS.HEIGHT` / `TOP_MARGIN` / `BOTTOM_MARGIN`. `HEIGHT`
went 8 → 14 for the taller pills, and both paths picked that up from the one constant.

**Pills that would overflow the node are dropped, not wrapped.** Wrapping would make node height
depend on keyword text, which means teaching the dimension engine to agree on a line count — a much
larger change. Measured against realistic keyword sets: four short keywords use 142 of the available
192px, and only three long words (`transcendence, invulnerable, purification`) overflow, dropping the
third.

**A separate pause from Task 1** — it's SVG rather than HTML, so a different implementation with a
different failure mode, and it's only worth doing once Task 1's pill design is settled.

When _Show matching keywords_ is enabled, the tree draws matching keywords as an italic SVG `text`
line under the node (`renderKeywords`). Render them as the same pill shape as Task 1.

**Two load-bearing constraints:**

- Node keyword rendering lives inside the dimension engine's height budget (`NODE.KEYWORDS.HEIGHT`,
  `TOP_MARGIN`, `BOTTOM_MARGIN`). Pills are taller than a text line, so `talentNodeDimensions.ts` must
  be updated in the same change or nodes will overlap — the reserved height and the drawn height have
  to agree.
- **Do not use a `foreignObject`.** The description's `transform: translateZ(0)` workarounds in the
  stylesheet exist because of what `foreignObject` costs on mobile. Draw `rect` + `text` pairs, and
  measure the text with `talentTextMeasurer.ts` rather than guessing pill widths — SVG `text` with
  `text-anchor: middle` reports no width.

### Task 3 — Per-node appearance animation — STATUS: TODO

Each talent node appears slightly **squished vertically** and stretches to its full height, while
**fading up from a lower opacity**. Two properties, one short animation, entirely per-node.

**Each node animates on its own, with no reference to any other node.** No stagger, no depth-based
delay, no sequencing against links or indicators. Every node runs the identical animation at the same
time. This is deliberate — it is what makes the effect impossible to look inconsistent or out of sync.

**Implement in CSS, not JS.** Add keyframes to
[`src/styles/_animations.scss`](../styles/_animations.scss) and apply them from
`TalentTree/index.module.scss` on the node's class. Because the render effect clears the SVG and
re-appends every node, the animation restarts naturally on each redraw with no JS bookkeeping. Do not
add `d3-transition` or any timing code.

**The two traps, both about SVG transforms:**

1. **The node's `<g>` already has a `translate(...)` for its layout position, and a CSS `transform` on
   the same element replaces it** — the nodes will pile up at the origin. Either animate a **wrapper
   or inner `<g>`** rather than the positioned one, or animate a non-transform property. Adding an
   inner group in `renderTalentNode` is the more predictable route.
2. **SVG `transform-origin` defaults to the SVG user-space origin, not the element's own box**, so
   `scaleY(0.9)` will also throw the node across the canvas. Set `transform-box: fill-box` and
   `transform-origin: center` on whatever element is scaled. Verify this in the browser at both zoom
   modes — this is the part most likely to behave differently under Cover's `viewBox` versus a
   numbered stop's explicit `scale()`.

**Deliberately left to trial and error in the browser** — start here and expect to change all of it:

- Squish amount: start around `scaleY(0.92)` → `scaleY(1)`.
- Starting opacity: start around `0.4` → `1`.
- Duration: start around 200ms, ease-out. It plays on _every_ keystroke-driven redraw, so anything
  long reads as lag.
- **Whether the fade applies to the whole node or only its text.** The task allows either; the text
  option is worth trying if the whole-node fade makes the tier borders look washed out mid-animation.

**Watch for**:

- **Cost at ~500 nodes.** That many simultaneous CSS animations on SVG groups is the performance risk;
  check mobile specifically. If it stutters, animating opacity alone (no transform) is the cheap
  fallback.
- **`prefers-reduced-motion`** — wrap the animation in a media query so it is simply absent when the
  user has asked for reduced motion.
- Requirement nodes (the circular class/energy roots) are drawn by a different function than talent
  nodes. Decide whether they animate too, and be consistent — a tree where only some node types
  animate looks like a bug.

---

## Rejected — do not re-propose

| Idea                                                      | Why not                                                                                                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staggered / depth-based / tree-wide entrance animation    | Tried and rejected: inconsistent between branches, visually hacky, and far too much complexity for the payoff.                                                                               |
| `d3-transition` or any JS-driven tree animation           | Same. Task 3 is CSS-only per-node by design.                                                                                                                                                 |
| Animating links, requirement indicators, or the container | Coordinating multiple animated layers is what made the tree-wide version look wrong.                                                                                                         |
| Animating expand/collapse or filter-toggle reflow         | The instant DOM swap reads better; a change the user just made needs no explaining.                                                                                                          |
| Talent-name autocomplete in the search field              | The field searches descriptions too; name suggestions would misrepresent it and narrow how people search.                                                                                    |
| Pills _inside_ the search field (token input)             | Can only pill segments before the caret, so the keyword being typed stays loose text while already filtering.                                                                                |
| A tag-input package (`react-tagsinput`, Tagify, …)        | All own a `tags: string[]`, duplicating the comma string in `useKeywords`; they ship their own CSS.                                                                                          |
| Live result count under the search bar                    | A live pill row already reads as what is filtering.                                                                                                                                          |
| Node hover state, ancestry-path highlight, hover tooltips | Nodes aren't clickable — a hover affordance implies an interaction that doesn't exist. Useless on mobile.                                                                                    |
| Tier legend above the tree                                | Too much chrome in the results panel.                                                                                                                                                        |
| Per-option match counts on filter checkboxes              | Not wanted.                                                                                                                                                                                  |
| "Non-default filter" badges / conditional Reset state     | Not wanted.                                                                                                                                                                                  |
| Requirement-icon hover growth + desaturate-when-unchecked | The existing 0.5→1 text opacity is sufficient signalling.                                                                                                                                    |
| `rainTexture` on Card Set / requirement checkboxes        | Not wanted.                                                                                                                                                                                  |
| Empty state naming the blocking filter                    | Not wanted.                                                                                                                                                                                  |
| Tier-gradient links                                       | Tier colours are Sass-only; a gradient needs them as `stop-color` attributes, which means either a fragile CSS-custom-property route or duplicating the palette in TypeScript. Not worth it. |
| Descendant count (`+7`) on the expansion button           | Dropped along with the rest of the tree-rendering changes; revisit separately if still wanted.                                                                                               |
