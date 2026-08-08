# Spec: Eventmaps juice

Bringing Eventmaps up to the level of interaction and polish that Cardex and Skilldex got over the
last few PRs. Four tasks, independent of each other, ordered so the riskiest layout work lands
before the cosmetic work that sits on top of it.

Eventmaps today is almost entirely inert: the tree is a static SVG dump with `pointer-events: none`
on every text element and **no hover or click handler anywhere** in `EventTree/`. The event *list*
has hover states; the tree does not. Closing that gap is Task 1.

## Decisions already made

- **No D3 transitions, anywhere.** `d3-transition` was tried on Skilldex and worked out badly
  (see `0dec41b`, "Rewrote specs after many failed attempts with d3-transitions"). Every animation
  in this spec is CSS keyframes on elements D3 has already appended and will never touch again.
  D3's role stays: append element, set class, walk away. If a task seems to need an interpolated
  value, that is a signal the task is wrong — raise it rather than reaching for `.transition()`.
- **Path highlighting is a class toggle, not a fade.** An instant opacity swap reads better than a
  transition for "show me how I get here", and it sidesteps the transition ban entirely.
- **Task 2 is a curated mapping with a raw-string fallback, not a parser.** The data has 106
  distinct effect verbs and 46 requirement verbs (counts below). Mapping all of them is not the
  goal and never will be — the long tail is one-offs like `RANDOMIZEENERGY` and `LIGHTLESSTEST`.
- **Task 2 does not touch the parser or `event-trees.json`.** Presentation only. The raw strings
  stay in the data; the mapping lives in the rendering layer.
- **Stagger is by depth, not by node.** A per-node stagger on the 198-node `Frozen Heart` would
  take most of a minute. See Task 3.
- Left to trial and error in the browser: the exact dim opacity in Task 1, the stagger constants in
  Task 3, and whether the token colours in Task 2 need per-category tuning or one accent is enough.

## How to work through this spec

### What to read first

- **Root `CLAUDE.md`** — Working Style (progress cadence, the dev-server rule), the testing policy
  (no permanent tests; delete any written during development), and `npm run verify` as the required
  check before anything is considered done.
- **`src/codex/CLAUDE.md`** — the whole Invariants list, but these four constrain this work directly:
  - **Layout/render split.** Tree layout is memoized on tree/filter/formatting inputs; zoom only
    re-renders. `EventTree` is `React.memo`'d and takes scalar props, not hook-result objects.
    **Don't merge the layout and render effects, and don't add `zoomLevel` to the layout memo's
    deps** — that separation is what keeps zooming off the dimension-caching path. Task 1 and Task 3
    both add work to the *render* effect and must leave the layout memo alone.
  - **Node-dimension caches are keyed by all rendering settings.** Any new setting that changes a
    node's size must go into the cache key in `eventNodeDimensions.ts` (`makeKey`), or nodes get
    drawn at stale dimensions. Task 2 is the one that can trip this — see its Risk note.
  - **The dimension helper and the renderer must agree on the vertical stack**
    (text → effects → requirements → continues → loop), or nodes reserve height for a box drawn
    elsewhere. `calculateEffectsBoxDimensions` / `calculateRequirementsBoxDimensions` in
    `eventNodeDimensions.ts` and `renderEffectsBox` / `renderRequirementsBox` in
    `EventTree/nodes.ts` are the two sides of this.
  - **`requirements` render on `choice`, `result`, `dialogue` *and* `end` nodes.** `isRequirementsNode`
    gates both the width calculation and the box height. Narrowing that guard silently hides 21
    nodes' conditions rather than failing.
- **`src/codex/utils/eventTreeSpacing/README.md`** — before touching anything that changes node
  dimensions (Task 2). The horizontal pass is `d3-flextree` plus a multi-parent centering pass for
  refChildren; widths feed it directly.
- **`scripts/parse/README.md`**, the conditional-variant section (~line 208) — for Task 2, this is
  where the `NOT ` prefix convention on requirements comes from and why dialogue/end nodes carry
  them at all. Note line 270: the parser's engine-test shape *depends* on those requirements being
  visible.

### Where to stop

**Each task pauses for confirmation.** Tasks 1, 2 and 3 all render into the same SVG and can mask
each other: a dim rule from Task 1 and an entry animation from Task 3 both act on node opacity, and
a mistake in either is invisible once the other is layered on top. Task 2 changes node *dimensions*,
which moves every node in the tree — diffing that against a tree that also just started animating is
not a diff anyone can read.

So: finish the task, run `npm run verify`, get it into a state the user can look at, say what changed
and name the specific states to compare, and **wait**. The **user** spins up the dev server, not the
agent. Mark the task `COMPLETED` in this file *before* asking the user to verify it — this spec is
the shared record of progress, and a fresh context picking the work up later has only the spec to
tell it what is already done.

No task here is invisible on its own; each has a directly observable effect.

### How it gets verified

- `npm run verify` after every task (required before the task counts as done).
- `npm run build` is **not** needed — no task touches `pages/`, `next.config.ts`, or a data hook.
- Visually in the user's dev server, per task. Tree layout and rendering changes are verified by
  before/after comparison, not tests (`src/codex/CLAUDE.md`, last invariant). Each task below names
  the states to compare. Across the board that means at minimum:
  - **All three levels of detail** — Compressed / Balanced / Wall of text. Compact mode takes
    different code paths in almost every render function (`isCompact` branches throughout
    `nodes.ts`), so a change verified only in Balanced is a change verified once out of three.
  - **Both looping-path modes** — «Loops back to» tags vs. links back.
  - **Cover zoom and a zoomed-in stop**, since the scroll wrapper swaps between
    `--cover-zoom` and `--drag-mode` and the CSS differs.
  - **A large tree and a small one.** `Frozen Heart` (198 nodes) is the stress case; `The Nexus` and
    `Mysterious Crates` (104 each) are the realistic large case; `Mimic` and `Small Fortune` are
    single-node trees and are exactly where an off-by-one in per-node logic shows up.
  - **Mobile and desktop.** Mobile forces scroll navigation regardless of the setting
    (`isDragMode = !isMobile && ...` in `EventTree/index.tsx`).

### Which docs change with the work

- **`src/codex/CLAUDE.md`** — add invariants as each task lands:
  - Task 1: that hit-testing depends on the node rect, that `.event-node-text` must keep
    `pointer-events: none`, and that the ancestor set is precomputed in the render effect rather
    than walked on each hover.
  - Task 2: that the token mapping is presentation-only with a raw-string fallback, that an
    unmapped verb must fall through rather than vanish, and — if the mapping changes rendered text
    widths — that it is now part of the dimension cache key.
  - Task 3: that node entry is staggered by `depth`, with the reason (per-node stagger does not
    scale to 198 nodes).
- **`src/codex/components/ResultsPanels/EventResultsPanel/EventTree/index.module.scss`** — gains the
  dim/highlight rules (Task 1) and the entry keyframes hook (Task 3).
- **`src/styles/_animations.scss`** — Task 3 may add a keyframe here alongside `resultRowIn`, if the
  node entry animation is worth sharing. If it is only ever used by the event tree, keep it local to
  the tree's stylesheet instead.
- No `README.md` under `scripts/parse/` changes — Task 2 is presentation-only and the parser output
  is untouched. **If any task turns out to need a parser or data change, that contradicts a decision
  above: raise it with the user rather than quietly widening the scope.**

### Comment style

The non-obvious *why*, in a line or two. No restating the code, no narrating the history of a change.
The existing comments in `ResultCard/index.tsx` around `ENTRY_STAGGER_MS` and `$row-entry-animation`
are the house standard — they explain why `backwards` is needed and why the animation is declared
once, not what a keyframe is.

---

## Task 1 — Ancestor path highlighting on node hover

**Status:** NOT STARTED

Hovering any node dims everything except that node's chain of ancestors back to the root, and the
links along that chain. This is the highest-value item in the spec: with trees up to 198 nodes, the
hard question a reader has is "how do I get *here*", and nothing in the UI answers it today.

**Behaviour**

- Hovering a node: the node, all its ancestors, and the links connecting them stay at full opacity.
  Everything else — nodes, links, badges — dims.
- Leaving the node restores everything.
- Instant, no transition (see Decisions).
- Desktop only. Hover does not exist on touch; on mobile this should be inert rather than
  sticky-on-tap, since tapping is how you scroll the tree there. Gate on the existing
  `useBreakpoint()` `isMobile`.

**Implementation notes**

- **Hit targets.** `.event-node-text` has `pointer-events: none` and must keep it — the text sits
  above the rect and would otherwise swallow the hover. Bind the handler to the node's `<g>` and let
  the `.event-node` rect be the hit area. Note that `shouldSkipDrawingNodeRectangle` /
  `isEmojiOnlyNode` means **some nodes have no rect at all** — those are emoji-only nodes and will
  have no hit target. Decide deliberately whether to give them an invisible one or to leave them
  unhoverable, and write down which.
- **Precompute the ancestor sets in the render effect**, not on each hover. `d3-hierarchy` gives
  `node.ancestors()` directly; build a `Map<nodeId, Set<nodeId>>` once while drawing. Walking the
  hierarchy on every `mouseenter` across a 198-node tree is the version of this that feels laggy.
- Apply dimming by toggling a class on the SVG root (e.g. `.event-tree--has-hover`) plus a
  `--highlighted` class on the path members, so the CSS does the work with one rule pair rather than
  D3 setting inline opacity on hundreds of elements.
- **Links are the fiddly part.** Standard links are `path.link` bound to `root.links()`, but
  `drawRefChildrenLinks` appends its paths one at a time with no data binding, and loop-back links
  are a separate group entirely. Only *standard* links need to participate in the ancestor path;
  decide what refChildren and loop-back links do when something is hovered (dim with everything
  else is the simplest defensible answer) and say so in the comment.
- Do not add `zoomLevel` or hover state to the layout memo. Hover is a render-effect concern.

**Verify**: all states in "How it gets verified", plus specifically — hover a deep leaf in
`Frozen Heart` and confirm the chain to the root is unbroken; hover a node in a tree with
refChildren so the multi-parent case is exercised; hover the single node in `Mimic`; confirm nothing
highlights on mobile; confirm dragging the tree while hovering does not leave a node stuck
highlighted.

---

## Task 2 — Humanized requirement and effect tokens

**Status:** NOT STARTED

Requirements and effects currently render as raw engine strings: `questflag:huntress`,
`NOT questflag:priest`, `intellect:2`, `accesstoholy`, `GOLD: 25`, `HEALPERCENTAGE: 30`,
`SCREENSHAKE: 0`, `RELOADEVENTS`. This is the same problem the Cardex keyword pills solved. Two
layers, and **the second is the one with real user value**:

**2a — Cosmetic: emoji + humanized label.**
`GOLD: 25` → `💰 +25 Gold`, `HEALPERCENTAGE: 30` → `❤️ Heal 30%`, `intellect:2` → `🧠 Intellect 2`,
`questflag:huntress` → `🚩 Huntress quest`. `NOT x` renders as a visually negated variant (struck,
or red, or a `🚫` prefix — try it in the browser).

**2b — Functional: hide engine noise.** `SCREENSHAKE` (54 occurrences) and `RELOADEVENTS` (48) are
effects the player cannot perceive; they are pure engine bookkeeping cluttering the highest-traffic
nodes. Put them behind an advanced-options checkbox, defaulting to hidden. Candidates for the same
treatment, to confirm with the user rather than decide alone: `SETBACKGROUND`,
`SETBACKGROUNDMUSIC`, `SETAREABACKGROUND`, `STORYFUNCTION`, `PERSISTENT`.

**Scope: curate the head, fall through on the tail.** The data has **106 distinct effect verbs and
46 distinct requirement verbs**. Both distributions have a long one-off tail. Map roughly the top
20–30 of each — that covers the large majority of occurrences — and let everything else render
exactly as it does today.

Effect verbs by frequency (top of the distribution):

```
GOLD 108 · QUESTFLAG 63 · ADDCARD 59 · COMBAT 58 · SCREENSHAKE 54 · ADDTALENT 53 · RELOADEVENTS 48
NEXTAREA 41 · AREASPECIAL 35 · NEXTSTATUS 32 · DAMAGE 32 · HEALPERCENTAGE 31 · VICTORY 27
AREAEFFECT 25 · GOTOAREA 24 · ADDEVENTS 18 · REMOVEAREAEFFECT 17 · REMOVECARDFROMDECK 17
COMPLETEQUEST 17 · ADDKEYWORD 15 · REMOVEEVENT 15
```

Requirement verbs by frequency:

```
questflag 268 · intellect 44 · gold 44 · strength 44 · dexterity 36 · talent 33 · card 32
difficulty 25 · class 17 · accesstoholy 16 · decksize 10 · checkpoint 10 · COLLECTOR 10
areaspecial 10 · vaultnumber 9
```

**The fallback is load-bearing, and here is the proof.** The source data contains
**misspelled verbs** — `quetflag` (1) and `quesflag` (1), alongside the correct `questflag` (268) —
and entries that are not verbs at all, such as the requirement string
`All other paths are unreachable!` (3) and bare tarot names (`The Blood Moon`, `The Hangman`,
`The Pale Mask`, …). An unmapped or malformed token **must render its raw string unchanged**. A
mapping that drops what it does not recognise would silently delete real content, and the typos
guarantee this case is live, not hypothetical.

**Casing is inconsistent too** — effects are upper-case (`GOLD`), requirements lower-case
(`gold`), but `COLLECTOR`, `LIGHTLESSTEST` and `CARDPUZZLE` appear upper-case as *requirements*,
and `Souls` appears in both cases as an effect. Match case-insensitively.

**⚠️ Risk — this task changes text, and text width drives node width.** `calculateListingsWidth` in
`eventNodeDimensions.ts` measures every requirement and effect string to size the node; the widths
then feed `d3-flextree`. Replacing `HEALPERCENTAGE: 30` with `❤️ Heal 30%` changes that measurement,
so **the dimension code must measure the humanized string, not the raw one** — the same string the
renderer will draw. The clean way is one shared `toDisplayToken(raw)` called by both
`eventNodeDimensions.ts` and `nodes.ts`, exactly as `getNameRowHeight` is shared on the talent side
for the same reason. Writing the transformation out twice is the failure this invariant exists to
prevent.

Additionally: **if 2b's checkbox can hide effects, it changes node height**, so it must go into the
dimension cache key (`makeKey` in `eventNodeDimensions.ts`) alongside `showContinuesTags` and
`showLoopingIndicator`, *and* into `useAllEventSearchFilters` with its setter tracked (the
`TRACKED_FILTER_HANDLERS` invariant — an untracked mutator applies visibly but never persists and
reverts on reload). It also needs adding to `resetFilters` and to the debounced cache write.

Emoji have their own measurement quirks in this codebase (see `getEmojiMargin` and
`NODE_BOX.EMOJI_MARGIN_BY_LEVEL_OF_DETAIL`) — check that `measureEventTextWidth` handles the emoji
prefixes sanely before committing to emoji on every token.

**Suggested order within the task**: 2b first (a checkbox that hides two verbs is a small, isolated
dimension change, so any cache-key mistake surfaces immediately and cheaply), then 2a.

**Verify**: all states, with particular attention to node widths and the resulting layout — this is
the task that moves every node. Compare `Frozen Heart` and `The Nexus` before/after for tree width
blowup. Confirm a node carrying an unmapped verb still shows its raw string. Confirm the `NOT `
prefix renders correctly on the ~50 negated requirements. Confirm dialogue/end requirement boxes
still appear (the `isRequirementsNode` invariant). Toggle 2b's checkbox and confirm nodes resize
rather than reserving stale height, then reload and confirm the setting persisted.

---

## Task 3 — Staggered node entry, by depth

**Status:** NOT STARTED

The Cardex cascade (`ef9022a`), adapted to the tree. When a tree renders, nodes fade and rise in
waves from the root outward.

**Implementation**

Same technique as `ResultCard`, and deliberately not a D3 transition: after the render effect
appends the node `<g>` elements, set an inline `animation-delay` on each, with the keyframes in
SCSS. D3 sets one attribute and is done; CSS owns the animation. Nothing interpolates, nothing
fights the layout memo.

- **Stagger by `d.depth`, not by node index.** `Frozen Heart` has 198 nodes; at the Cardex-like 60ms
  per step a per-node stagger runs for twelve seconds. Depth gives a genuine ripple outward from the
  root and bounds the total by tree depth rather than node count.
- **Cap the total duration anyway.** Deep trees still have a lot of depth levels — clamp the delay
  the way `ENTRY_STAGGER_MAX_ROWS` does, so beyond some depth everything starts together.
- `animation-fill-mode: backwards` is required, for the same reason it is in `ResultCard`: without
  it every node paints at full opacity through its own delay and only then animates.
- Keep the stagger a decent fraction of the per-node duration, or neighbouring depths animate in
  unison and the cascade reads as a flicker rather than a wave.
- **Animate only the node `<g>`.** Links are a separate selection; animating them in step is a
  possible follow-up but is not in scope here, and half-animated links look worse than static ones.

**⚠️ Watch:** the render effect re-runs on *every* settings change — zoom, level of detail, looping
mode, altered badges. Replaying a full entry cascade every time someone nudges the zoom slider will
be irritating fast. Decide when the animation should actually run (event change only is the likely
answer; zoom and formatting changes should not retrigger it) and implement that deliberately — a
`key` on the SVG or a ref holding the last-animated event name. **Get this right before tuning the
timings**, or the tuning happens against the wrong behaviour.

**Verify**: all states. Specifically — switch events and confirm the cascade runs; drag the zoom
slider and confirm it does *not* re-run; toggle level of detail and confirm the same; check
`Frozen Heart` for total duration feeling reasonable and `Mimic` (one node) for the degenerate case;
check on mobile, where the tree is smaller and the cascade is proportionally more noticeable.

---

## Task 4 — Event list polish

**Status:** NOT STARTED

The list at `/eventmaps` (`EventResultsPanel/EventList/`) is the first thing every user sees and got
none of the Cardex treatment. Three additions:

- **Staggered entry on the grid items**, retriggering when the filter text changes. Same technique
  as Task 3 and `ResultCard` — and here the Cardex approach transfers directly, since this is real
  DOM in React, not SVG. The container can be keyed on the filter text so a new filter remounts the
  items and re-runs the animation with no JS, exactly as `CardResultsPanel` keys on
  `parsedKeywords.join(',')`. Note the stagger must run **across** type groups, not restart per
  group — `CardResultsPanel` solves the identical problem with a running `precedingCards` count
  rather than a CSS `nth-child` delay.
- **Type emoji in the group subheaders.** `eventTypeMapper` already returns them
  (`💁‍♂️ NPC-related events`, `⛩️ Shrines`, …) and the subheader already renders that string — so
  check what is actually missing here before changing anything. If the emoji are already present,
  the useful version of this is styling them distinctly from the label text rather than adding them.
- **A size hint per list item.** A user cannot currently tell the single-node `Mimic` from the
  198-node `Frozen Heart` before clicking. A small node count, or ending count, or both, as a muted
  pill on the right of the row. Both are cheap to compute by walking `event.rootNode`, but **compute
  them once for all events in a `useMemo`, not per row** — 203 events, and `EventListItem` re-renders
  on hover.

Watch the existing `nth-child` alternating-row backgrounds in `EventList/index.module.scss`: they
are hand-tuned per breakpoint for 4/3/1 columns and are easy to break. Adding a pill inside the row
should not disturb them, but changing row structure would.

**Verify**: desktop (4 columns), tablet (3), mobile (1). Filter to a handful of events and confirm
the stagger reruns and runs across group boundaries. Confirm the alternating row backgrounds and the
last-in-row gradient fade still work at every breakpoint, including incomplete final rows. Confirm
the "no events found" state still looks right.
