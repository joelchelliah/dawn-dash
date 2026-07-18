# SPECS — Improvements to the event-tree parsing workflow

Improvement specs for `scripts/parse/` (and the small parts of `scripts/` it depends on),
ordered by importance. Each spec is independent unless noted.

**Impact** = how much it improves correctness / maintainability / performance / extensibility.
**Effort** = estimated work including re-verifying output (a run of `parse-event-trees.js` +
`validateEventTreesChanges()` showing no unexplained diffs in `event-trees.json`).

Legend: 🔴 High · 🟡 Medium · 🟢 Low

---

## 1. Split `parse-event-trees.js` into focused modules

**Impact: 🔴 High (maintainability, readability) · Effort: 🟡 Medium**

The main file is ~3,100 lines and mixes at least five separate concerns:

- Ink-runtime tree building (`buildTreeFromStory` + knot/function detection) — ~1,300 lines
- Ref normalization passes (`normalizeRefsPointingToChoiceNodes`, `...CombatNodes`, `promoteShallowDialogueMenuHub`)
- Structural deduplication (`deduplicateEventTree`, `areSubtreesIdentical`, DFS tin/tout guard)
- Sibling/cousin ref → `refChildren` conversion (3 large functions)
- Pipeline orchestration + stats + debug helpers (`processEvents`, `checkInvalidRefs`, `debugCheckEventPipelineState`)

Proposed layout (keeps `node-splitting.js`, `random-support.js`, etc. as they are — they are
already well-factored):

```
parse/
  index.js                 # entry point: processEvents() + pipeline wiring
  tree-building.js         # buildTreeFromStory, parseInkStory, knot/function detection
  tree-utils.js            # countNodes, getMaxDepth, buildNodeMapForTree, findInvalidRefsInTree, createNode
  ref-normalization.js     # choice/combat ref normalization, hub promotion, transitive resolution
  deduplication.js         # deduplicateEventTree + helpers
  ref-children.js          # sibling/cousin/non-single-child cousin conversions
```

Shared helpers like `buildNodeMapForTree` and `countNodes` are currently reimplemented ad hoc
inside several passes (e.g. `findNodeById` BFS inside `post-processing-hub-pattern-optimization.js`);
a `tree-utils.js` module ends that.

This is a prerequisite that makes most of the specs below cheaper and safer to do.

---

## 2. Replace the hand-rolled pipeline in `processEvents()` with a declarative pass registry

**Impact: 🔴 High (extensibility, readability) · Effort: 🟡 Medium**

`processEvents()` currently repeats the same boilerplate ~11 times: check an `..._ENABLED` flag,
`console.log` a banner, loop over `eventTrees`, aggregate stats, log per-event details behind
`DEBUG_EVENT_NAME`, call `debugCheckEventPipelineState(...)`. The authoritative execution order
lives only in a comment in `configs.js` (lines 100–111), which can silently drift from the code.

Proposed: a pass registry that is the single source of truth for order, enablement, and logging:

```js
const PIPELINE = [
  { name: 'Filter default nodes',        enabled: cfg.FILTER_DEFAULT_NODES_ENABLED,        run: filterDefaultNodesPass },
  { name: 'Separate choices from effects', enabled: cfg.SEPARATE_CHOICES_FROM_EFFECTS_ENABLED, run: separateChoicesPass },
  ...
]

for (const pass of PIPELINE) {
  if (!pass.enabled) continue
  console.log(`\n▶ ${pass.name}...`)
  const stats = pass.run(eventTrees, context)   // context = { idToName, debugEventName, ... }
  logPassStats(pass.name, stats)
  debugCheckEventPipelineState(eventTrees, `after ${pass.name}`)
}
```

Each pass becomes `(eventTrees, context) => stats`. Adding a new rule/pass becomes: write one
function, add one registry entry. This is the single biggest win for "easy to expand with new
rules in the future". It also removes the execution-order comment in `configs.js` (the registry
*is* the order) and gives every pass the debug-state check for free (several passes currently
don't have one).

---

## 3. Eliminate module-level mutable state; pass a per-event parse context

**Impact: 🔴 High (correctness risk, testability) · Effort: 🟡 Medium**

Tree building relies on five module-level mutable variables (`nodeIdCounter`,
`totalNodesInCurrentEvent`, `pathConvergenceStates`, `hubChoiceSnapshots`,
`dialogueMenuHubIdsByEventName`), reset by hand at the top of `parseInkStory()` — except
`dialogueMenuHubIdsByEventName`, which is never reset. Meanwhile `buildTreeFromStory` takes
**12 positional parameters**, most of which are threaded unchanged through every recursive call.

Proposed: one context object created per event and passed explicitly:

```js
function parseInkStory(inkJsonString, eventName) {
  const ctx = {
    eventName,
    nextNodeId: 0,
    nodesCreated: 0,
    pathConvergenceStates: new Map(),
    hubSnapshot: null,            // was hubChoiceSnapshots (only ever one entry per event)
    randomVars, functionDefinitions, functionCalls, knots,
  }
  return buildTreeFromStory(story, ctx, { depth: 0, pathHash: '', visitedStates, stateToNodeId, pathTextToNodeId })
}
```

Notes:
- `hubChoiceSnapshots` and `dialogueMenuHubIdsByEventName` are Maps keyed by event name but are
  reset (or should be) per event — they only ever hold one entry. They should be plain fields.
- This makes tree building a pure(ish) function of its inputs — testable in isolation and safe to
  parallelize later (see spec 14).
- The unused `ancestorTexts` parameter ("kept for potential future use") should be dropped.

---

## 4. Replace depth-limited structural dedup with bottom-up subtree hashing

**Impact: 🔴 High (correctness + performance) · Effort: 🟡 Medium**

`deduplicateEventTree` has two structural weaknesses:

1. **It is approximate.** The signature includes children's fields plus descendant *counts* at
   depths 1–3 (`DEDUPLICATE_SUBTREES_SIGNATURE_DEPTH`). Two subtrees identical down to level 3
   with the same shape-counts below it — but different text/effects at level 4+ — will be
   **falsely merged**, silently corrupting the tree. `areSubtreesIdentical` re-checks the same
   shallow criteria, so it doesn't protect against this.
2. **It is O(n²)-ish.** `countNodes(node)` is called per candidate node, and the whole thing is
   re-run `DEDUPLICATE_SUBTREES_NUM_ITERATIONS` times to catch cascading duplicates.

Proposed: classic Merkle-style hashing — compute each node's hash bottom-up as
`hash(text, choiceLabel, type, requirements, effects, ref, children.map(h => h.hash))`.
Equal hash (plus one exact deep-equality check on collision) ⇒ subtrees are *provably* identical
at all depths. One post-order traversal per tree:

- exact instead of approximate → removes the false-merge class of bugs
- O(n) → removes the need for `SIGNATURE_DEPTH`, multiple iterations, and the per-node `countNodes`
- cascading duplicates are caught in a single pass (parents of identical children hash identically)

Keep the existing external-ref guard (`subtreeWouldPruneExternalRefTarget`) and the
`RANDOM_KEYWORD` skip as-is. `DEDUPLICATE_SUBTREES_EVENT_BLACKLIST` is empty and flagged with a
"can probably be removed" TODO — remove it as part of this.

---

## 5. CLI flags for debugging and fast iteration — ✅ COMPLETED

**Impact: 🔴 High (developer experience) · Effort: 🟢 Low**

Today, debugging requires editing source (`const DEBUG_EVENT_NAME = 'Frozen Heart'` at the top of
`parse-event-trees.js`, `const DEBUG = false` inside `splitCombatNode`), and every run parses all
~hundreds of events and rewrites the full output file.

Proposed flags on `parse-event-trees.js` (and forwarded by `sync-events.js`):

- `--debug "<event name>"` — replaces the `DEBUG_EVENT_NAME` constant
- `--only "<event name>"` — parse just one event; **merge** its tree into the existing
  `event-trees.json` instead of regenerating everything (fast iteration on one problem event)
- `--dry-run` — parse + validate but don't write the output file
- `--baseline <file>` — make `validateEventTreesChanges()` compare against an arbitrary snapshot
  file instead of `git HEAD`, so refactoring experiments don't require a commit between runs
  (see "Verification strategy" below)

This costs an afternoon and pays for itself immediately, since the whole tuning workflow for this
parser is "tweak config → re-run → inspect one event".

---

## 6. Validate configuration and alterations against reality at startup

**Impact: 🟡 Medium-High (correctness) · Effort: 🟢 Low**

All special-casing is keyed by exact event-name strings scattered across
`DIALOGUE_MENU_EVENTS`, `PATH_CONVERGENCE`, `DEFAULT_NODE_BLACKLIST`,
`POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST`, and `event-alterations.js`. If an event is
renamed upstream (or a config entry has a typo), the special-casing **silently stops applying** —
the most likely failure mode of this whole system, and today it's invisible.

Proposed: after loading `events.json` and computing display names, verify every configured event
name resolves to a real event, and fail loudly (or at minimum print a prominent ⚠️ block) when it
doesn't. Also:

- Validate `hubChoiceMatchThreshold` is in (0, 100] once at startup, instead of warning inside
  `checkHubChoiceMatch` on every call.
- `applyEventAlterations` already warns when a `find` matches nothing — surface those warnings in
  the end-of-run summary (they currently scroll past hundreds of log lines).
- Print a final summary line: `N config entries applied, M unmatched` so a healthy run is
  distinguishable from a silently degraded one.

---

## 7. Make output validation structural instead of line-diff based

**Impact: 🟡 Medium (correctness of the safety net) · Effort: 🟡 Medium**

`parse-validation.js` shells out to `git diff` on a ~32,000-line pretty-printed JSON file and
walks diff hunks with a line-number bookkeeping loop, a 50-line `recentLines` ring buffer, and a
heuristic ("does a `]` within 20 lines belong to a `refChildren` array?") to ignore id churn.
It also embeds event-specific ignore rules (the `"Focus on the ..."` prefixes, the oxidised-skeleton
text) as hardcoded strings.

Proposed: compare *structures*, not text lines:

1. Load the baseline JSON (via `git show HEAD:...` as today, or via `--baseline <file>` from
   spec 5) and the current JSON.
2. Deep-normalize both: strip `id` everywhere, and replace each `ref`/`refChildren` value with a
   **descriptor of its target** (e.g. the target node's `text`/`choiceLabel` plus its path from
   the root) instead of the numeric id.
3. Deep-compare per event; report events whose normalized trees differ.

Step 2 is the key correctness upgrade over the current validator, not just a cleanup. Today *any*
`ref` change is treated as noise (numeric ids legitimately renumber every run), which means a ref
that silently starts pointing at a **different target node**, or a real subtree collapsing into a
ref, is largely invisible — often surfacing only as ignored `id:`/`ref:` lines. That is exactly
the class of regression the dedup/ref-pass specs (4, 8) could introduce. Target descriptors keep
id renumbering invisible while making target changes show up.

This also removes the entire line-mapping machinery (~150 of 210 lines), is immune to formatting
changes, and gives better output (it can say *which node path* changed, not just which event).
The known non-determinism tolerances (the `"Focus on the ..."` prefixes, the oxidised-skeleton
text) carry over as explicit per-event ignore rules in the shared config (spec 12) applied during
normalization, rather than hardcoded strings in the diff walker. Also fixes the
`"Events failig validation"` typo.

---

## 8. Merge the three cousin-ref conversion functions

**Impact: 🟡 Medium (maintainability) · Effort: 🟡 Medium**

`convertCousinRefsInTree` and `convertNonSingleChildCousinRefsInTree` duplicate ~120 lines
verbatim: the `buildMaps` parent/node map builder and the entire "walk up both ancestor chains to
find the common ancestor where they become siblings" block (lines ~2607–2663 vs ~2835–2890 of the
current file). They differ only in the single-child filter and the reordering strategy.

Proposed:

- Extract `buildParentAndNodeMaps(rootNode)` and `findCommonSiblingAncestor(refParent, targetParent, parentMap)`.
- Collapse the three converters into one `findConvertibleRefs(rootNode)` +
  strategy-specific reorder/convert steps.

This is also the code most likely to grow (the config already reserves `COUSIN_REF_BLACKLIST` /
`COMPLEX_COUSIN_REF_BLACKLIST` escape hatches for layout problems), so shrinking it before it
grows again is worth it.

---

## 9. Stop cloning tracking Maps/Sets on every recursion step

**Impact: 🟡 Medium (performance/memory) · Effort: 🟢 Low-Medium**

Every call to `buildTreeFromStory` clones three collections:

```js
const newVisitedStates = new Set(visitedStates)
const newStateToNodeId = new Map(stateToNodeId)
const newPathTextToNodeId = new Map(pathTextToNodeId)
```

For deep trees (up to `MAX_DEPTH` 100, `NODE_BUDGET` 30,000 nodes) this is O(pathLength) copying
per node — quadratic allocation on long paths, likely the dominant cost for the big events
(Rathael, Frozen Heart) alongside `story.state.toJson()`.

Since these collections are strictly path-scoped, cloning is equivalent to backtracking on shared
collections: add the current entries before recursing into children, delete them after. Same
semantics, zero copies. (Verify with a before/after diff of `event-trees.json` — it should be
byte-identical apart from nothing.)

The Ink `story.state.toJson()` / `LoadJson()` snapshot per choice is inherent to the exploration
approach and not worth fighting.

---

## 10. Normalize child text consistently in the early-ref path

**Impact: 🟡 Medium (correctness) · Effort: 🟢 Low**

The main text-collection loop in `buildTreeFromStory` applies `normalizeRandomEffectsInLine()`
and `normalizeKeywordTags()` to every line. The `getChildTextFromStory()` helper (used by the
dialogue-hub immediate-ref path to peek at a child's text) does **not** — so ref nodes created
through that path can carry un-normalized text (raw `GOLD:47` instead of the random form, raw
`[kw:reliable]` tags). That text also feeds `menuExitPatterns` matching, so a keyword tag in a
child's text could make an exit-pattern check disagree with the main path's behavior.

Fix: extract one `collectStoryText(story, randomVars)` helper used by both call sites, returning
`{ text, numContinues }`, with normalization applied identically. Also removes the duplicated
`numContinues = Math.max(0, continueCount - 1)` logic (currently computed in 4 places).

---

## 11. Stop swallowing errors silently

**Impact: 🟡 Medium (debuggability) · Effort: 🟢 Low**

Several `catch` blocks discard errors entirely: `parseFunctionDefinitions`,
`detectFunctionCalls`, `detectRandomVariables`, `getChildTextFromStory` (`// Handle gracefully`).
If the Ink JSON layout shifts in a game update, these features (random-value detection,
ADDKEYWORD resolution) would degrade **silently** — trees would still build, just with worse
content, and nothing would say why.

Fix: route all of these through one `debugLog(eventName, ...)` / `warnOnce(...)` helper that at
minimum counts failures per event and prints a summary (`⚠️ random-var detection failed for 3
events: ...`). Full stack traces only when `--debug` matches (spec 5).

---

## 12. Consolidate all per-event special-casing into one config module

**Impact: 🟡 Medium (maintainability, discoverability) · Effort: 🟢 Low-Medium**

Per-event knowledge currently lives in six places:

| Location | Special-casing |
|---|---|
| `configs.js` | `DIALOGUE_MENU_EVENTS`, `PATH_CONVERGENCE`, `DEFAULT_NODE_BLACKLIST`, hub blacklist |
| `event-alterations.js` | manual tree fixes |
| `parse-event-trees.js` | `determineNameAndAlias` alias map (`'Heart of the Temple' → 'Heart of Fire'`), `branchingCommands = ['COLLECTOR']` |
| `node-splitting.js` | `resolveSpecialKeywordEffects` hardcodes Shrine of Trickery values |
| `parse-validation.js` | ignored text prefixes (`'Focus on the Blacksmith'`, ...) |
| `extract-events.js` | `DEPRECATED_EVENTS` |

Answering "what special handling does event X get?" requires grepping six files. Proposed: a
single `event-overrides.js` (or a directory with one file per concern re-exported from an index)
so every per-event rule is registered in one discoverable place, with the event name as the key.
This also gives spec 6's validation a single list to check.

---

## 13. Type the tree-node shape once and lint the scripts

**Impact: 🟡 Medium (maintenance, correctness) · Effort: 🟡 Medium**

The node shape (`id/text/type/choiceLabel/requirements/effects/numContinues/ref/refChildren/children`)
is defined properly in `src/codex/types/events.ts` but is only implicit in the scripts — and every
file starts with `/* eslint-disable */`, so nothing checks even basic mistakes. The parser is the
*producer* of the shape the app depends on, yet it's the least-checked code in the repo.

Proposed, in increasing order of ambition (pick one):

1. Add a JSDoc `@typedef {import('../../src/codex/types/events').EventTreeNode} EventTreeNode`
   in `tree-utils.js` and annotate the main functions; TypeScript's `checkJs` via `type-check`
   can then validate the scripts.
2. Replace the blanket `/* eslint-disable */` with targeted rule disables (`no-console` is the
   real reason; scripts legitimately log).
3. Convert `scripts/parse/` to TypeScript executed with `tsx` (bigger change, best long-term).

Even option 1+2 alone would catch field-name typos and shape drift between parser and renderer.

---

## 14. Parallelize event parsing with worker threads (measure first)

**Impact: 🟡 Medium (performance) · Effort: 🟡 Medium**

Events are parsed strictly sequentially, but each event is completely independent during tree
building (post-processing passes run per-tree too; only the final sort/write is global). After
spec 3 removes shared mutable state, a `worker_threads` pool of N workers each parsing a slice of
events is straightforward and should scale near-linearly with cores for the expensive events.

Caveat: **measure before doing this.** The script already prints total parsing time — if a full
run is comfortably fast (< ~30s), spec 5's `--only` flag solves the iteration-speed problem more
cheaply and this spec can be skipped indefinitely.

---

## 15. Small cleanups (batch these opportunistically)

**Impact: 🟢 Low · Effort: 🟢 Low**

- `extractChoiceMetadata` calls `require('./node-splitting.js')` **inside the function body** on
  every invocation (hot path). Move to top-level imports.
- `buildIdToNameMapping()` performs the same two Blightbane API fetches in both
  `extract-events.js` and `parse-event-trees.js` within one `sync-events.js` run. Cache the
  mapping to `scripts/data/` in step 2 and read it in step 3 (also makes `parse-event-trees.js`
  runnable offline).
- `CARD_ID_COMMANDS` / the `ADDCARD|REMOVECARD|...` regex list is duplicated between
  `extract-events.js` and `parse-event-trees.js` — move to `scripts/shared/card-data.js`.
- `replaceCardIdsInNode` builds a `new RegExp` per command per effect string; precompile once.
- `deduplicateAllTrees`: remove the empty `DEDUPLICATE_SUBTREES_EVENT_BLACKLIST` (existing TODO)
  — subsumed by spec 4.
- `console.warn` monkey-patching for the inkjs version warning would be tidier as a tiny helper
  with a comment, or by pinning/upgrading inkjs when a v21-capable release exists.
- `determineNodeType` returns `'choice'` for empty text, which reads as a misnomer at the call
  site (the value is later overwritten in most paths); document or restructure.
- Fix the `"Events failig validation"` typo (subsumed by spec 7 if done).
- The `resolveTransitiveRefs` helper in `post-processing-hub-pattern-optimization.js` does a
  full-tree BFS (`findNodeById`) per ref lookup — use the node map that already exists in that
  scope (subsumed by spec 1's `tree-utils.js`).

---

## Verification strategy

How we check that a change didn't meaningfully alter the generated trees. The existing
`validateEventTreesChanges()` in `parse-validation.js` is the backbone: it reports per-event
"meaningful diff" while ignoring the known run-to-run noise.

**Known non-deterministic surface** (already encoded as ignore rules in `parse-validation.js`):

- `id` / `ref` / `refChildren` numeric values — traversal-order dependent, renumber every run
- Random Ink content that executes during story exploration: the `"Focus on the ..."`
  text/choiceLabel variants and the `"A skeleton in highly oxidised..."` text line
- External: card/talent names come from a live Blightbane API fetch at parse time, so upstream
  data changes can alter output independently of our code

**Per-change workflow:**

1. **Before starting a spec**: regenerate `event-trees.json` with the *current* script and commit
   it, so the baseline reflects what today's code actually produces (including current API data).
   With spec 5's `--baseline <file>` flag, a saved snapshot file replaces the commit step.
2. Make the change, re-run `node scripts/parse/parse-event-trees.js`.
3. `validateEventTreesChanges()` must report **zero** events for pure refactors
   (specs 1, 2, 3, 5, 9, 15). For behavior-changing specs (4, 6, 7, 8, 10), review every reported
   event deliberately and spot-check it in the Eventmaps dev server (per the repo's
   visual-verification policy).
4. After a verified step, re-commit the regenerated output so the next step diffs against a clean
   baseline.

**Known blind spot until spec 7 lands:** the current validator ignores *all* `ref` changes
(necessarily, since ids renumber). A ref that moves to a different target node, or a subtree
collapsing into a ref, can therefore pass validation unseen. This is acceptable for the pure
refactors, but specs 4 and 8 mutate exactly this ref structure — so spec 7's target-descriptor
comparison should land **before** them.

**Nondeterminism audit (cheap, one-off):** run the parser twice back-to-back with no code
changes and diff the two outputs. That empirically enumerates the full non-deterministic surface
and confirms the documented ignore rules still cover all of it — worth doing once before the
refactor starts, and again if the game data updates significantly.

> Audit result (2026-07-18): two consecutive runs differed in exactly two events —
> **Fallen Soldier** (oxidised-skeleton text: "nearby wall" vs "nearby signpost") and
> **Mirror Shard** ("Focus on the ..." label shuffling). Both are covered by the existing
> ignore rules; the validator reports zero events. Additionally, `--only` re-parses produce
> different node ids than full runs (post-processing ids come from a counter shared across
> all events in a full run) — structurally identical, and invisible to the validator.

---

## Suggested sequencing

1. **Spec 5 (CLI flags, incl. `--baseline`)** — cheapest, immediately improves every later
   verification loop. Run the nondeterminism audit (above) here.
2. **Specs 1 + 2 (module split + pass registry)** — structural foundation; pure refactor,
   verified by a zero-event validation report.
3. **Spec 3 (parse context)** — next pure refactor on the new structure.
4. **Specs 6 + 7 (config validation, structural output validation)** — land the verification
   upgrades *before* the passes they are meant to guard.
5. **Specs 4 + 8 (dedup rewrite, cousin-ref merge)** — the ref-mutating changes, now covered by
   spec 7's ref-target-aware comparison. Validate diffs event-by-event.
6. **Specs 9–13, 15** in any order, opportunistically.
7. **Spec 14** only if measurement says it's needed.
