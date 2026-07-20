# SPECS — Improvements to the event-tree parsing workflow

Improvement specs for `scripts/parse/` (and the small parts of `scripts/` it depends on),
ordered by importance. Each spec is independent unless noted.

For an overview of how the pipeline works end to end, see [README.md](./README.md).

**Impact** = how much it improves correctness / maintainability / performance / extensibility.
**Effort** = estimated work including re-verifying output (a run of `parse-event-trees.js` +
`validateEventTreesChanges()` showing no unexplained diffs in `event-trees.json`).

Legend: 🔴 High · 🟡 Medium · 🟢 Low

---

## 1. Split `parse-event-trees.js` into focused modules — ✅ COMPLETED

**Impact: 🔴 High (maintainability, readability) · Effort: 🟡 Medium**

> Implementation notes: the entry point stays `parse-event-trees.js` (instead of the proposed
> `index.js`) so `sync-events.js` and the documented commands keep working. Two modules were
> added beyond the proposed layout: `debug.js` (shared `--debug` state, replaces the module-level
> `DEBUG_EVENT_NAME` constant across modules) and `misc-passes.js` (checkInvalidRefs,
> replaceCardIdsInNode, filterDefaultNodes).

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

## 2. Replace the hand-rolled pipeline in `processEvents()` with a declarative pass registry — ✅ COMPLETED

**Impact: 🔴 High (extensibility, readability) · Effort: 🟡 Medium**

> Implementation notes: the `PIPELINE` registry lives in `parse-event-trees.js`; each entry is
> `{ name, enabled?, banner?, run(eventTrees, context) }` and every pass gets a
> `debugCheckEventPipelineState` check after it. The execution-order comment in `configs.js` now
> points at the registry. One deliberate ordering change: the card/talent id→name mapping is
> fetched *before* the pipeline runs (it used to happen between two passes) — output-identical,
> since only the final `replaceCardIds` pass consumes it.

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

## 3. Eliminate module-level mutable state; pass a per-event parse context — ✅ COMPLETED

**Impact: 🔴 High (correctness risk, testability) · Effort: 🟡 Medium**

> Implementation notes: `parseInkStory` now builds a per-event `ctx` (eventName, static
> analysis results, `nodesCreated`, `pathConvergenceStates`, `hubSnapshot`) and
> `buildTreeFromStory(story, ctx, path)` takes per-branch state as a `path` object —
> 12 positional params → 3. The unused `ancestorTexts` was dropped. Two deliberate
> exceptions stay module-level: the node-id counter (in `tree-utils.js` — post-processing
> passes continue allocating from it after parsing, by design) and
> `dialogueMenuHubIdsByEventName` (a cross-event debug registry read between pipeline
> passes). Verified with a ref-target-aware structural comparison across all 183 events:
> only Mirror Shard (known random noise) differed from the pre-change baseline.

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

## 4. Replace depth-limited structural dedup with bottom-up subtree hashing — ✅ COMPLETED

**Impact: 🔴 High (correctness + performance) · Effort: 🟡 Medium**

> Implementation notes: duplicate detection is *rendering equivalence*, not literal tree
> equality — build-time loop detection routinely produces one expanded copy of a subtree
> and sibling copies made of refs INTO it, which must merge (e.g. Trapped In Amber's two
> paths to the same demon dialogue). Two mechanisms compose:
> 1. Exact bottom-up hash-consing (interning): a node's key contains its children's
>    already-interned ids, so equal ids are *provably* identical subtrees — used as the
>    fast path, no collision case to handle.
> 2. `nodesEquivalent`, a cycle-safe ref-resolving structural comparison (graph
>    bisimulation, coinductive pair-memo): a ref node is equivalent to the expansion it
>    points at (self-copy refs continue at the target's children, continuation refs at
>    the target itself). Candidates are grouped by root text/choiceLabel/type and checked
>    pairwise against recorded originals, with the hash as a per-pair short-circuit.
>
> The merge exempts the candidate root's own requirements/effects/numContinues — those
> survive on the ref node and are rendered there (requirements are path-dependent: two
> copies of the same shared future can be gated differently). Deeper nodes are exact on
> ALL fields, including numContinues, which the old signature never compared even though
> the renderer shows it as "⏭️ Continues: N". `NUM_ITERATIONS` was replaced by looping
> until a pass removes nothing; `SIGNATURE_DEPTH`, the empty `EVENT_BLACKLIST`, and
> `getDescendantCountAtDepth` are gone, and `DEDUPLICATE_SUBTREES_ENABLED` is the new
> toggle. The pass now also skips descendants of already-collapsed subtrees — the old
> stats ("447 duplicates / 3176 nodes removed") were inflated by re-processing
> unreachable nodes; the honest figures are 107 / 1011.
>
> Verified with spec 7's structural validator: 11 events changed, each reviewed.
> Mysterious Crates (+23 nodes) restores genuinely different content the old pass falsely
> merged (its depth-3 signature never saw the difference). The other 10 all shrink:
> equivalence-based merges the old pass missed (Count Vesparin, Damsel in Distress,
> Emberwyld Heights Finish, Entwined Statue, Frozen Heart, Heart of the Temple, Noxlight
> Swamp Finish, Suspended Cage, The Boneyard, The Defiled Sanctum Start) — typically a
> duplicated intermediate node whose children were only ref stubs into the expanded copy,
> now collapsed to a single ref. Net: 3928 → 3909 nodes, zero invalid refs.

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

## 6. Validate configuration and alterations against reality at startup — ✅ COMPLETED

**Impact: 🟡 Medium-High (correctness) · Effort: 🟢 Low**

> Implementation notes: `config-validation.js` (`validateEventConfigs`) runs in
> `processEvents()` right after loading `events.json` and computing display names, and
> **hard-fails** (throw → exit 1) on any unresolved entry. It checks all name-keyed config
> sources — the four listed below plus the cousin-ref/dedup blacklists and the new
> `VALIDATION_IGNORE_RULES` (spec 7) — and validates `hubChoiceMatchThreshold` ∈ (0, 100]
> at startup (the per-call warning in `checkHubChoiceMatch` was removed).
> `applyEventAlterations` now collects its warnings into a caller-provided array, and the
> run ends with a `🔧 Event alterations: N applied, M warning(s)` summary that lists them.
> A healthy run prints `✅ Config validation: all N per-event config entries resolve`.

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

## 7. Make output validation structural instead of line-diff based — ✅ COMPLETED

**Impact: 🟡 Medium (correctness of the safety net) · Effort: 🟡 Medium**

> Implementation notes: `parse-validation.js` was rewritten as proposed (same
> `validateEventTreesChanges(options)` API). Ref descriptors are
> `target{path=root.i.j…, text=…, choiceLabel=…}`, computed from *masked* values so the
> nondeterminism rules apply to targets too. The ignore rules moved to
> `VALIDATION_IGNORE_RULES` in `configs.js`, now **scoped per event** (Fallen Soldier /
> Mirror Shard) instead of global — and spec 6's startup check validates their keys.
> Failing events are reported with the first differing node path and both values; added and
> removed events are reported too. Verified with synthetic mutation tests: uniform id
> renumbering → invisible; a text change, a ref retargeted to a different valid node, a
> subtree collapsed into a ref, and added/removed events → all caught; masked noise (and
> only within its own event) → ignored. The line-mapping machinery and the temp-file
> `git diff --no-index` invocation are gone; the `"failig"` typo died with them.

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

## 8. Merge the three cousin-ref conversion functions — ✅ COMPLETED

**Impact: 🟡 Medium (maintainability) · Effort: 🟡 Medium**

> Implementation notes: extracted `buildParentAndNodeMaps` and
> `findCommonSiblingAncestor`, plus one shared `findConvertibleCousinRefs` scan whose
> entries carry single-child flags; the two cousin converters became strategy functions
> filtering that one scan (mutually exclusive filters, so no ref converts twice). One
> up-front scan is safe because conversions never change parentage — only sibling order
> and `ref` → `refChildren`. The sibling converter was kept as its own traversal (it
> shared no code with the cousin pair; the ~120 duplicated lines were between the two
> cousin functions). Pure refactor: validated zero-diff against a pre-change snapshot,
> same 84 conversions.

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

## 9. Stop cloning tracking Maps/Sets on every recursion step — ✅ COMPLETED

**Impact: 🟡 Medium (performance/memory) · Effort: 🟢 Low-Medium**

> Implementation notes: the three collections are registered just before the
> children-exploration loop and removed right after it (the only recursion happens inside
> that loop, so moving registration later than the old clone point is unobservable — in
> particular, leaves no longer register at all, which nothing can see). Two backtracking
> subtleties: `visitedStates.delete` only runs when this call inserted the hash (with
> choice+path detection disabled, an ancestor's entry could otherwise be removed), and
> `pathTextToNodeId` restores the *previous* value instead of deleting (registration
> doesn't check node type while the cycle check does, so a non-dialogue node can shadow
> an ancestor's dialogue entry). Verified zero-diff. Full-parse time dropped ~37s → ~24s
> under identical conditions; runs now complete in ~6s (the remainder was Blightbane API
> latency, since removed from the loop by spec 15's mapping cache).

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

## 10. Normalize child text consistently in the early-ref path — ✅ COMPLETED

**Impact: 🟡 Medium (correctness) · Effort: 🟢 Low**

> Implementation notes: `collectStoryText(story, ctx)` in tree-building.js returns
> `{ text, continueCount, numContinues }` and is used by both the main text-collection
> loop and `getChildTextFromStory` — normalization (random effects + keyword tags) and
> the numContinues rule now live in exactly one place. Runtime errors mid-story keep the
> partial text and warn (the child path's silent `catch` is gone — see spec 11). Output
> was verified zero-diff: the inconsistency was latent in the current game data, so no
> visual verification was needed.

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

## 11. Stop swallowing errors silently — ✅ COMPLETED

**Impact: 🟡 Medium (debuggability) · Effort: 🟢 Low**

> Implementation notes: `recordParseFailure(category, eventName, error)` and
> `printParseFailureSummary()` live in debug.js. The three static-analysis catch blocks
> (`parseFunctionDefinitions`, `detectFunctionCalls`, `detectRandomVariables`) record
> per-category/per-event failures; the entry point prints the summary at the end of the
> run (a healthy run prints nothing). Full error + stack prints immediately when
> `--debug` matches the event. `getChildTextFromStory`'s silent catch was subsumed by
> spec 10's `collectStoryText`, which warns inline like the main path always did.

Several `catch` blocks discard errors entirely: `parseFunctionDefinitions`,
`detectFunctionCalls`, `detectRandomVariables`, `getChildTextFromStory` (`// Handle gracefully`).
If the Ink JSON layout shifts in a game update, these features (random-value detection,
ADDKEYWORD resolution) would degrade **silently** — trees would still build, just with worse
content, and nothing would say why.

Fix: route all of these through one `debugLog(eventName, ...)` / `warnOnce(...)` helper that at
minimum counts failures per event and prints a summary (`⚠️ random-var detection failed for 3
events: ...`). Full stack traces only when `--debug` matches (spec 5).

---

## 12. Consolidate all per-event special-casing into one config module — ✅ COMPLETED

**Impact: 🟡 Medium (maintainability, discoverability) · Effort: 🟢 Low-Medium**

> Implementation notes: `event-overrides.js` now holds every per-event structure:
> `DIALOGUE_MENU_EVENTS`, `PATH_CONVERGENCE`, `DEFAULT_NODE_BLACKLIST`, the hub and
> cousin-ref blacklists, `VALIDATION_IGNORE_RULES` (from parse-validation via configs),
> `EVENT_NAME_ALIASES` (was the inline `aliasMap`), `DEPRECATED_EVENTS` (was in
> extract-events.js), and `SPECIAL_KEYWORD_EFFECT_VALUES` (was hardcoded Shrine of
> Trickery values in node-splitting.js). `event-alterations.js` keeps the manual fixes
> (size) and is re-exported as `EVENT_ALTERATIONS`. configs.js keeps only pass toggles
> and non-per-event knobs, spreading the per-event structures into
> `OPTIMIZATION_PASS_CONFIG` so pass code is unchanged. Spec 6's startup validation now
> sources everything from event-overrides.js and additionally checks aliases and
> deprecated events (26 → 30 validated entries). `branchingCommands = ['COLLECTOR']`
> stays in tree-building.js — it's a game-mechanic constant, not per-event.
> Verified zero-diff.

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

## 13. Type the tree-node shape once and lint the scripts — ✅ COMPLETED

**Impact: 🟡 Medium (maintenance, correctness) · Effort: 🟡 Medium**

> Implementation notes: options 1 + 2 were taken (option 3, TS conversion, was not).
> The node shape is the `ParseNode` typedef in tree-utils.js — deliberately a *superset*
> of the app's `EventTreeNode` union, because parser nodes temporarily carry field
> combinations the discriminated union forbids; its `type` field imports the app's
> `EventNodeType`, so renderer/parser drift in node types is caught. tree-utils.js is
> fully `// @ts-check`-checked; tree-building.js and misc-passes.js reference the typedef
> on their main functions (other files can opt in with a `// @ts-check` header later).
> `tsconfig.scripts.json` (allowJs, per-file opt-in checking) is chained into
> `npm run type-check`. All blanket `/* eslint-disable */` headers were removed and
> replaced by a `scripts/**/*.js` override in .eslintrc.js turning off only `no-console`
> and `@typescript-eslint/no-require-imports`; `npm run lint` and prettier
> (`npm run format`/`format:check`) now cover `scripts/`. Real findings fixed along the
> way: dead `extractJsonParseData` in fetch-events-data-from-blightbane.js, several
> unused variables, one `prefer-const`, import ordering.

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

> Measured (2026-07-19, after specs 9 + 15): a full run takes **~6 seconds** (was ~37s
> before spec 9's backtracking change and spec 15's card-mapping cache). Per the caveat
> above, this spec can be skipped indefinitely.

---

## 15. Small cleanups (batch these opportunistically) — ✅ COMPLETED

**Impact: 🟢 Low · Effort: 🟢 Low**

> Implementation notes per item, in order: (1) the in-body `require` was already gone
> (fixed by spec 1). (2) The id→name mapping is cached to
> `scripts/data/card-id-mapping.json` (gitignored): `buildIdToNameMapping()` writes it on
> every live fetch (extract step), and the parse step reads it via
> `readOrFetchIdToNameMapping()` with a live-fetch fallback — the parse step is now
> runnable offline and no longer bound to API latency. (3) `CARD_ID_COMMANDS` lives in
> `scripts/shared/card-data.js`; `INLINE_CARD_ID_COMMANDS` (without AREAEFFECT) is the
> extract-time subset, preserving the previous behavior where AREAEFFECT ids are only
> resolved in the parse step's effects. (4) `replaceCardIdsInNode` uses module-level
> precompiled `CARD_ID_EFFECT_PATTERNS`. (5) Dedup blacklist was already removed by
> spec 4. (6) The monkey-patch is now `suppressInkjsVersionWarning()` with an explanatory
> comment (inkjs still has no v21 release). (7) `determineNodeType`'s `'choice'`-for-empty-text
> is documented as a provisional value at its definition. (8) Typo already died with
> spec 7. (9) `resolveTransitiveRefs` uses one `buildNodeMapForTree` map instead of a
> full-tree BFS per lookup. All verified zero-diff.

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

## 16. Hoist pure stand-in ref nodes — ✅ COMPLETED

**Impact: 🟢 Low-Medium (visualization) · Effort: 🟢 Low**

Follow-up from verifying spec 4 (requested during review of Damsel in Distress).
Deduplication leaves each duplicate as a stand-in node carrying the link (a tree node has
exactly one parent, so the second occurrence must exist to hold the ref), and pass 10
converts nearby links to `refChildren`. When such a stand-in is a *pure copy* of the node
it stands for — identical text/type/choiceLabel/requirements/effects/numContinues — and is
its parent's only child, the stand-in is redundant: the new `hoistPureStandInRefNodes`
pass (pass 11, `HOIST_PURE_STAND_IN_REF_NODES_ENABLED`) deletes it and points the parent's
`refChildren` directly at the original node, so the converging line skips the duplicate.

> Implementation notes: only `refChildren` stand-ins are hoisted — `ref` (jump-link)
> stand-ins stay, since converging lines to distant targets are the layout problem the
> cousin blacklists exist for. Guards: the stand-in must not be referenced by any other
> ref/refChildren, all its refChildren targets must share one parent (the original), and
> the pass loops until stable to catch chains. Removed 35 stand-in nodes across 20 events.
> Choice nodes with `refChildren` already existed (30 in the previous output), so this
> creates no new rendering shape.

---

## 17. Merge duplicate combat nodes (post-alteration dedup) — ✅ COMPLETED

**Impact: 🟢 Low-Medium (visualization) · Effort: 🟢 Low-Medium**

> Implementation notes: implemented as TWO passes right after `applyEventAlterations`,
> because the merge should happen as high as possible — at the duplicated *choice*
> wrapper, not the combat node under it (first attempt merged at combat level and left
> stand-in combat ref nodes under still-duplicated choices):
>
> 1. `deduplicateAllTreesPostAlterations` (pass 13, toggle
>    `DEDUPLICATE_SUBTREES_POST_ALTERATIONS_ENABLED`) simply runs pass 7's
>    `deduplicateAllTrees` again. Why pass 7 missed these: it runs before the
>    alterations, when each duplicated chain is `choice → combat leaf` = 2 nodes,
>    below `DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE` (3); the boss-transition `GOTO EVENT`
>    child added in pass 12 grows the chains to 3 nodes, so the re-run merges them at
>    the choice level. Made safe to run post-refChildren (all no-ops for the pass-7 run,
>    where no refChildren exist yet): the external-ref prune guard now also protects
>    refChildren targets, root refChildren are always compared (they'd survive on the
>    ref node), and nodes carrying refChildren are never merge candidates (a node must
>    never hold both ref and refChildren).
> 2. `mergeDuplicateCombatNodes` (pass 14, toggle `MERGE_DUPLICATE_COMBAT_NODES_ENABLED`,
>    in deduplication.js) catches what the re-run can't: copies behind non-identical
>    choice wrappers whose chains stay below the size gate (The Defiled Sanctum Start's
>    two differently-labeled Fight choices). Identity is exact on EVERY field including
>    requirements/effects (a combat node's effects are the fight, so no root-field
>    exemption like pass 7) plus structurally identical children; deeper copies become
>    `ref` jump links to the shallowest (BFS-first) copy, with pass 7's guards (skip
>    `«random»` text, don't prune externally-referenced descendants, track pruned ids,
>    loop until stable). Childless copies are deliberately NOT merged (Count Vesparin's
>    three identical combat leaves stay expanded): merging exists to remove redundant
>    subtrees, and a leaf has none — a merge there would only add a jump-link arrow.
>
> The copies all sit at different depths from their originals, so none would qualify for
> pass 10's sibling/cousin refChildren conversion — jump links are the right shape and
> passes 10/11 don't need re-running. The three resolve-during-implementation points:
> pass 9 runs earlier so it can't undo the new refs (and these are boss-transition combat
> nodes, not split wrappers, so its "don't ref a combat wrapper" intent doesn't apply);
> distant copies stay as jump links per the above; and refs pointing at combat/choice
> nodes already existed in the output (Heart of the Temple, Possessed Priestess; 47
> choice refs), so no new rendering shape is created.
>
> Result: of the 18 predicted copies, the 16 that carried a redundant subtree are gone —
> 16 dedup merges (incl. a bonus one: Frozen Heart's two "Attempt to remove the ice"
> puzzle branches, made identical by the CARDPUZZLE replaceNode alteration) + 1
> combat-level merge; Count Vesparin's 2 leaf copies stay by design. 3874 → 3838 nodes,
> zero invalid refs, validator reports exactly the 7 changed events, every diff site
> reviewed via a normalized structural diff vs HEAD.

Spotted while visually verifying spec 4/16 output (Frozen Heart): events that get boss
transitions via `event-alterations.js` render several identical combat nodes — same text,
same `COMBAT: …` effect, each with an identical `GOTO EVENT: … Death` child (Frozen Heart
has 5 redundant "Such bravado!" / Battleseer Hildune copies). As of the spec 4 output,
18 such redundant copies exist across 8 events (Frozen Heart, Abandoned Village, The
Silent Reliquary Start, Count Vesparin, The Chieftain, and the three Sanctum Starts).

Why deduplication misses them: at dedup time (pass 7) these combat nodes are **leaves** —
their `GOTO EVENT` child is only added by `applyEventAlterations` (pass 12) — and leaves
are never dedup candidates (nor would size 2 pass `DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE`).

Proposed: a small merge step after `applyEventAlterations` that collapses identical combat
subtrees (same text/requirements/effects and structurally identical children) into
refs/`refChildren` to the shallowest copy, like the dialogue-node treatment from specs 4
and 16. Things to resolve during implementation:

- `normalizeRefsPointingToCombatNodes` (pass 9) deliberately rewrites refs aimed at
  *split* combat nodes to their postcombat dialogue child. It runs earlier, so it won't
  undo the new refs, but the design intent ("don't ref a combat wrapper") should be
  checked against this case — the boss-transition combat nodes are not split wrappers.
- Whether a jump-link `ref` or converging `refChildren` looks right likely depends on
  distance, same as pass 10's sibling/cousin rules; distant copies (Frozen Heart's are in
  far-apart branches) may want to stay as jump links.
- Renderer handling of refs pointing at combat nodes needs a visual check.

---

## 18. Generalize branching-command detection beyond `COLLECTOR`

**Impact: 🟡 Medium (correctness) · Effort: 🟡 Medium**

`detectBranchingCommand` (`tree-building.js`) hardcodes `branchingCommands = ['COLLECTOR']` as the
only signal that a node's effects should trigger exploring all of an event's orphan knots (knot
bodies in `root[2]` / the `root[0]` trailing object that are never reached by any Ink divert,
choice pointer, or function call — only by an external game-engine trigger naming the knot to run).
A full scan of all 183 events' compiled Ink for orphan knots (knots present in `root[2]`/trailing-object
but never targeted by any `->`, `*`, or `f()` in the same event) found exactly **three** such
"external selector" commands, of which only one is handled:

| Command | Event | Orphan knot(s) | Currently handled? |
|---|---|---|---|
| `COLLECTOR` | Collector | `Drakkan, Asteran, GoldenIdol, Legendary, Corruption, Common, Uncommon, Monster, Rare, Epic` | Yes — `detectBranchingCommand` |
| `STORYFUNCTION:changeCost:imbueCost` | Enchanter 1 | `changeCost` | **No** |
| `SELECTCARD` / `CARDPUZZLE` | Frozen Heart | `puzzlesuccess`, `puzzlefail` | Only via a hand-written `event-alterations.js` `replaceNode` that copy-pastes the puzzle-outcome text — not via generic detection |

`Enchanter 1`'s gap is a **silent wrong-value bug**, not a missing branch: the tree shows
`enchantmentCost`'s Ink global-declaration default (100 gold) as if it were final, when the
`changeCost` knot (`~ enchantmentCost = newCost`) is meant to recompute it dynamically. Since
`changeCost` has no choices, there's nothing to branch on — the fix is just to run it (see spec
19 for why the current knot walker can't).

`Frozen Heart`'s puzzle content already renders correctly today (via the manual alteration), but
only because someone noticed the empty tree and hand-reconstructed the two outcomes by reading
the raw knot bodies. The next event that reuses this pattern will silently produce an incomplete
tree until someone repeats that manual archaeology.

Proposed: extend `detectBranchingCommand`'s `branchingCommands` list to include `STORYFUNCTION`
and `SELECTCARD`/`CARDPUZZLE`, and generalize the knot-selection logic so any orphan knot
referenced by one of these commands' value (or, for `CARDPUZZLE`, the sibling `puzzlesuccess`/
`puzzlefail` knots by naming convention) is explored the same way `COLLECTOR`'s knots are —
each becomes a `result`-type child with a requirement string naming the command/target. This
would let Frozen Heart's alteration be deleted (verify via spec's zero-diff comparison) and fix
Enchanter 1's stale-value bug. Depends on spec 19 to actually walk non-flat knot bodies correctly.

---

## 19. Make `parseKnotContentManually` handle non-flat knot bodies

**Impact: 🟡 Medium (correctness) · Effort: 🟡 Medium**

`parseKnotContentManually` (`tree-building.js`) is a hand-rolled walker over a knot's raw JSON
array that only understands plain strings (accumulated as text, with `>>>>`/`>>>` command
detection) and literal `\n` — every other element (nested arrays, conditionals, choice bodies,
Ink stack-machine bytecode like `{"VAR?":...}`/`{"VAR=":...}`/`{"temp=":...}`) is silently
skipped per the comment "Skip other Ink control structures (objects, arrays, etc.)".

This is currently invisible because the only knots ever passed through it (Collector's ten
`root[2]` knots) happen to be flat narrative text + `#`-tagged metadata. It stops being invisible
the moment a knot with real structure is walked. Concretely, `Enchanter 1`'s `changeCost` knot —
which spec 18 proposes exploring — is:

```json
[
  {"temp=": "newCost"},
  "ev", {"VAR?": "newCost"}, "/ev",
  {"VAR=": "enchantmentCost", "re": true},
  {"#f": 1}
]
```

Simulating the current walker on this body produces `text: "ev/ev"` and zero effects — the
entire "assign `enchantmentCost := newCost`" semantics is lost, not degraded. `GoldenIdol`'s
`take` knot (reached via normal divert today, so not walked by this function) shows the same
risk more starkly: a full embedded 4-choice menu with sub-bodies and further diverts, which
would only ever yield leading narration text if it were ever routed through
`parseKnotContentManually` instead of the real traversal.

Proposed: either (a) replace `parseKnotContentManually` with a recursive walk that treats the
knot body as a nested container and reuses the existing choice/divert extraction primitives
already used for the main story text collection, or (b) for the narrower cases spec 18 actually
needs (Collector's flat knots, Enchanter 1's variable assignment, Frozen Heart's puzzle-outcome
text), keep the walker but add explicit handling for `{"VAR?": name}` (resolve against the
already-detected `randomVars`/global-decl defaults, same as `normalizeRandomEffectsInLine` does
for the main path) and `{"VAR=": name}` (record the assignment as an effect, e.g. "SET
enchantmentCost = newCost"), with a loud warning (via `recordParseFailure`, per spec 11's
pattern) whenever the walker encounters an object shape it doesn't recognize, so future drift is
visible instead of silently producing garbled text.

---

## 20. Explore Ink cycle/sequence (`seq`) alternatives instead of only the runtime's default pick

**Impact: 🟡 Medium (completeness) · Effort: 🟡 Medium-High**

Ink's cycle-alternative syntax (`{~ + | + | + }` compiling to a `["ev","visit",N,"seq", ...]`
bytecode container with `s0..sN` sub-bodies, dispatched by an internal per-container visit
counter modulo N) is structurally distinct from the `RANDOM(min, max)` pattern `random-support.js`
already detects (`["ev", min, max, "rnd", "/ev", {"VAR=": name}]`), and is **not detected by any
current code path**. A full-file scan found exactly three events using it:

- **`TheCardGame`** — the `random` function (called 3×/playthrough for `cardOne`/`cardTwo`/
  `cardThree`) is a 6-value cycle over card ids. Because the linear playthrough only calls it 3
  times, indices `s3`/`s4`/`s5` (3 of 6 possible outcome texts — "Action begets action...",
  "So be it...", "The skeleton grins gleefully...") **can never appear in the tree**, confirmed
  by running the parser.
- **`ArmsDealer`** — the opening line's "leans against a nearby ___" is a 4-value cycle
  (`stone`/`wall`/`tree trunk`/`signpost`). Only `s3` ("signpost") ever appears in the parsed
  output; the other 3 flavor variants are absent from the tree entirely.
- **`Shrine of Trickery`** — same 6-value cycle shape, but happens to work today: its payload is
  string return values that coincidentally match the existing `extractReturnValues` pattern used
  for `ADDKEYWORD` random-list resolution, so all 6 values surface via
  `ADDKEYWORD: random [...]`. This is a lucky accident of the payload type, not a working
  detection of the `seq` construct — it doesn't generalize to `TheCardGame`'s numeric-id payload
  feeding prose branching. (A related "once" variant, Ink's `{~ ... | ...}` MIN/stopping
  alternative — visible in `Weeping Woods Start` — happens to have both its values surfaced today
  via unrelated dialogue-hub re-visitation, again not by deliberate design.)

Proposed: detect the `["ev","visit",N,"seq", ...]` bytecode shape the same way `randomVars` are
detected today (a static pre-execution scan over the raw Ink JSON, in `random-support.js` or a
sibling module), collect each container's `s0..sN` sub-bodies, and treat a node whose command
value resolves to one of these cycle containers the same way `COLLECTOR` knots are treated (spec
18): explore every `sN` branch as a sibling alternative rather than only the one index the
single deterministic playthrough happens to land on. `Shrine of Trickery`'s existing (coincidental)
handling should keep working — this is additive — but its choice-label-ordering quirk (labels
assigned by literal `s0..s5` traversal order, not by which index the real `cardOne`/`cardTwo`/
`cardThree` calls actually land on first) is worth fixing at the same time since both live in the
same code path.

---

## 21. Explore LIST-typed variable branches (`Shard of Mirrors`)

**Impact: 🟢 Low (single event) · Effort: 🟡 Medium**

`Shard of Mirrors` is the only event in the dataset using Ink's `LIST` type (`listDefs`
non-empty): two LIST globals (`sPresentCharacters1`/`2`) represent which companion characters are
present in the current game run, populated by the external game engine before the event runs —
their Ink-side defaults are empty. The event's `KNOT_BRANCH_WAITING` knot gates 8 companion-story
branches (`blacksmith_story`, `alchemist_story`, `priestess_story`, `consul_story`,
`forger_story`, `succubus_story`, `collector_story`, `necromancer_story`) behind equality checks
against these LIST variables, and the "Focus on the X" choices offered are themselves built from
the same never-initialized variables. Because the parser only ever sees the empty-default state,
**none of the 8 companion-story branches is reachable**, and the 3 "Focus on the X" choices that
do appear in the output are an artifact of default-init behavior, not a representative sample.

This is lower priority than specs 18-20 (one event, and the 8 branches are currently just
placeholder text — "(fill in the lore for this.)" — not real content yet), but worth tracking
since the branches are structurally real and will presumably get real content eventually.

Proposed: a small special-case (similar in spirit to `DIALOGUE_MENU_EVENTS`/`PATH_CONVERGENCE` in
`event-overrides.js`) that, for this one event, re-runs exploration once per companion value (or
statically walks all 8 `KNOT_BRANCH_WAITING` branches directly from the raw Ink JSON, bypassing
the runtime the same way knot exploration already does), producing all 8 companion branches as
siblings instead of none. Given the low current content value, this can reasonably wait until the
companion-story text is actually written.

---

## 22. Harden `extractEffects` against bare-colon commands, and validate unrecognized commands

**Impact: 🟢 Low (currently dormant) · Effort: 🟢 Low**

Two related, lower-severity hardening items surfaced while auditing command extraction:

1. **Bare-colon commands are silently dropped, not degraded.** `extractEffects`'s per-command
   regex `/^([A-Za-z_]+)(?::(.+))?$/i` requires at least one character after a colon if a colon is
   present, so `"DAMAGE:"` (empty value) fails to match entirely and the whole command vanishes
   with no effect and no warning — `extractEffects('>>>>DAMAGE:\ntext')` returns `{ effects: [],
   cleanedText: 'text' }`. This pattern (`GOLD:`, `DAMAGE:`, `AREAEFFECT:`, etc., with the value
   being an unresolved `{"VAR?": name}` read) appears in ~20 events' **raw, pre-execution** Ink
   JSON, but is confirmed harmless today: inkjs resolves the variable read into a literal number
   before `collectStoryText` ever sees the line during normal traversal. The one place it's a live
   risk is inside `parseKnotContentManually` (spec 19), which walks raw un-executed JSON and does
   *not* resolve `VAR?` reads — today's Collector knots don't happen to trigger it, but spec 18/19's
   generalized knot exploration could. Fix: make the regex accept (and log) an empty value instead
   of silently failing to match, e.g. `/^([A-Za-z_]+)(?::(.*))?$/i` with a guard so an empty value
   doesn't produce `"COMMAND: "` in the output.
2. **85 of ~90 distinct commands get zero semantic validation.** Only `COMBAT`/`DIRECTCOMBAT`/
   `ADDKEYWORD` are special-cased in `extractEffects`, plus `ADDCARD`/`ADDTALENT`/`AREAEFFECT`/
   `REMOVECARD`/`IMBUECARD` via `CARD_ID_COMMANDS` elsewhere; every other command (`GOLD`,
   `QUESTFLAG`, `SCREENSHAKE`, `NEXTAREA`, `SETCLASS`, ... — 85 distinct names found) falls
   through to a generic `"COMMAND: value"` string with no validation at all. This is fine for
   rendering (unrecognized commands still display), but means a typo'd or renamed upstream command
   is accepted silently with no signal, unlike spec 6's config-name validation. Low priority: this
   is a hygiene/observability gap, not a correctness bug, since nothing currently depends on these
   values being validated. If ever addressed, route it through the same `recordParseFailure`/
   summary-at-end-of-run mechanism spec 11 established, rather than a hard failure.

(Two related hypotheses were investigated and ruled out: the command-body character-class regex
does **not** truncate any value in the current dataset — exhaustively checked, zero disallowed
characters found inside any command token — and `>>>` vs `>>>>` is confirmed pure authoring
inconsistency with no semantic difference, already handled by the existing `>>>>?` optional-arrow
pattern.)

---

## 23. Document "Shard of Strife"'s unreachable content (informational, no parser change)

**Impact: 🟢 Low (data hygiene, not a parser bug) · Effort: 🟢 Low**

Not a parser gap — flagged here only because it surfaced during this audit and is easy to
misdiagnose as one later. `Shard of Strife` ("Reflective Shard")'s compiled Ink contains a 5-way
"Focus on the {Blacksmith, Alchemist, Merchant, Enchanter, Priest}" choice menu plus a companion
`enemies` knot with named alternatives per character — structurally similar to (but distinct
from) `Shard of Mirrors`'s genuinely-nondeterministic "Focus on the ..." mechanism. Direct
exhaustive path replay via the raw inkjs runtime (bypassing the parser entirely, trying every
choice index at every branch from a fresh story) confirms this menu and the `enemies` knot are
**unreachable under any choice sequence** — the only paths the story ever offers lead to "Focus on
the Dawnbringer" or an immediate "Skip", both of which terminate before the menu is ever shown.
The parser is correctly reproducing what the runtime actually plays; the menu appears to be
vestigial content from an earlier version of the event.

Two low-cost follow-ups, neither urgent:
- If the team ever wants to audit for orphaned/dead authored content generally, this is a
  concrete example worth keeping a note of.
- `Shard of Strife` currently has zero entries in `DIALOGUE_MENU_EVENTS`, `VALIDATION_IGNORE_RULES`,
  `POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST`, or `event-alterations.js` — harmless today
  since the dead branch is never explored, but worth a second look (same nondeterminism treatment
  as `Mirror Shard`, or an alteration to surface the dead branch for documentation purposes) if the
  upstream game data is ever updated in a way that makes it reachable.

---

## Verification strategy

How we check that a change didn't meaningfully alter the generated trees. The existing
`validateEventTreesChanges()` in `parse-validation.js` is the backbone: it reports per-event
"meaningful diff" while ignoring the known run-to-run noise.

**Known non-deterministic surface** (encoded as per-event ignore rules in
`VALIDATION_IGNORE_RULES` in `event-overrides.js`, applied by `parse-validation.js`):

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

**Former blind spot, closed by spec 7:** the old line-diff validator ignored *all* `ref`
changes (necessarily, since ids renumber), so a ref moving to a different target node, or a
subtree collapsing into a ref, could pass validation unseen. The structural validator compares
refs by *target descriptor* (path + text/choiceLabel), so id renumbering stays invisible while
target changes are caught — specs 4 and 8, which mutate exactly this ref structure, are now
covered.

**Nondeterminism audit (cheap, one-off):** run the parser twice back-to-back with no code
changes and diff the two outputs. That empirically enumerates the full non-deterministic surface
and confirms the documented ignore rules still cover all of it — worth doing once before the
refactor starts, and again if the game data updates significantly.

> Audit result (2026-07-18): the non-deterministic surface has **three** classes, all covered
> by the validator's ignore rules:
> 1. **Fallen Soldier** — oxidised-skeleton text ("nearby wall" vs "nearby signpost")
> 2. **Mirror Shard** — "Focus on the ..." label shuffling
> 3. **Post-processing id shifts** — the id counter is not reset after the last parsed event,
>    and the number of ids that event allocates (including discarded exploration nodes) varies
>    with random rolls; when it does, every post-processing-generated id shifts by a uniform
>    offset, producing byte diffs in ~46 events with zero structural change. This class did
>    NOT show up in the first two-run audit (the counts happened to match) and was only
>    discovered during spec 3 verification — byte-level comparison is therefore not a reliable
>    pass/fail signal on its own; use the validator or a ref-target-aware structural diff.
>    (`--only` re-parses shift post-processing ids for the same reason.)

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
8. **Spec 22 (bare-colon hardening + command validation)** — cheapest of the new content-gap
   specs, no exploration-logic changes, and item 1 (bare-colon regex fix) is a prerequisite
   safety net before spec 19 starts walking more knot bodies through the same code path.
9. **Spec 19 (fix `parseKnotContentManually`)** before **spec 18 (generalize branching-command
   detection)** — spec 18's whole point is to explore more, and different-shaped, knot bodies
   (Enchanter 1's variable-assignment knot, Frozen Heart's puzzle knots) through this walker, so
   the walker needs to stop silently mangling non-flat bodies first. Verify spec 18 by confirming
   Frozen Heart's existing hand-written alteration becomes unnecessary (delete it, re-run, expect
   a zero-diff) and that Enchanter 1's `enchantmentCost` now reflects the computed value.
10. **Spec 20 (cycle/`seq` alternatives)** — independent of specs 18/19 (a different bytecode
    shape, detected the same way `randomVars` are today), but naturally grouped with them as
    "explore more of the branches the runtime's single playthrough would otherwise hide."
    Validate by confirming `TheCardGame` and `ArmsDealer` gain their missing flavor-text branches
    and `Shrine of Trickery`'s existing output is unchanged.
11. **Spec 21 (`Shard of Mirrors` LIST branches)** — lowest priority of the exploration specs
    (single event, placeholder content); reasonable to defer until the companion-story text is
    actually written upstream.
12. **Spec 23 (document `Shard of Strife`)** — no code change, do whenever convenient; not
    blocked on anything above.
