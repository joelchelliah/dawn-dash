# Event-tree parsing pipeline

Turns the game's own [Ink](https://www.inklestudios.com/ink/) stories into the static
`src/codex/data/event-trees.json` that the Eventmaps tool renders. The whole pipeline is run by
`scripts/sync-events.js`; this folder implements the final (and biggest) step.

## The big picture

```
Blightbane website bundle
        │
        │  scripts/fetch-events-data-from-blightbane.js
        ▼
scripts/data/dump.txt            (minified JS bundle)
        │
        │  scripts/extract-events.js
        │  - find JSON.parse('[...]') blobs, keep objects with event types
        │  - dedupe by caption+text, resolve card/talent ids -> names
        ▼
scripts/data/events.json         (each event's `text` = a compiled Ink story)
        │
        │  scripts/parse/parse-event-trees.js          <── THIS FOLDER
        │  1. tree building: replay every story path with the inkjs runtime
        │  2. post-processing: the PIPELINE pass registry (14 passes)
        │  3. validation: diff output vs baseline, ignore known noise
        ▼
src/codex/data/event-trees.json  (183 trees, ~4k nodes, statically imported)
        │
        ▼
Eventmaps (src/codex/) renders each tree with d3-flextree
```

The key idea: instead of parsing Ink's JSON format ourselves, we load each story into the
**official inkjs runtime and play it** — the same way the game does — exhaustively, snapshotting
and restoring story state to explore every choice.

## Module map

| File | Role |
|---|---|
| `parse-event-trees.js` | Entry point: CLI flags, parse loop, the `PIPELINE` pass registry, output writing |
| `tree-building.js` | Ink story exploration → raw tree (`parseInkStory`, `buildTreeFromStory`) |
| `tree-utils.js` | Node creation, node-id counter, generic tree helpers (`countNodes`, node maps) |
| `node-splitting.js` | Effect extraction (`>>>>COMMAND`), text cleaning, combat/dialogue/choice splitting |
| `random-support.js` | Random value detection (`RANDOM(min, max)`) and normalization to `«random»` |
| `ref-normalization.js` | Rewrite refs to point at the "right" node after structural passes move content |
| `deduplication.js` | Structural subtree dedup (identical subtrees → refs) |
| `ref-children.js` | Sibling/cousin refs → `refChildren` (renders as converging lines) |
| `misc-passes.js` | Invalid-ref check, card-id replacement, default-node filtering |
| `post-processing-hub-pattern-optimization.js` | Config-free BFS detection of dialogue-menu hubs |
| `apply-event-alterations.js` | Engine for manual per-event fixes |
| `event-alterations.js` | The manual fixes themselves (data) |
| `configs.js` | Pass toggles + per-event special-casing (hub events, blacklists) |
| `parse-validation.js` | Output diff validation against git HEAD or a `--baseline` snapshot |
| `debug.js` | Shared `--debug <event>` state read by all modules |

## Step 1: Tree building (`tree-building.js`)

Before playing a story, a few static scans of the raw Ink JSON collect what the runtime won't
tell us: random variable ranges (`VAR gold = RANDOM(5, 15)`), function definitions and their
possible return values (random keyword rewards), and *knot* definitions (named sections that
commands like `COLLECTOR` jump to dynamically).

Then `buildTreeFromStory()` explores every path:

```
story.Continue() until it stops     ──►  one node (text + effects extracted
        │                                from >>>>COMMAND:value markers)
        ▼
story.currentChoices
        │  for each choice:
        │    snapshot story state ── ChooseChoiceIndex(i) ── recurse ── restore
        ▼
children (choice label + requirements parsed from the label prefix)
```

Naive exhaustive exploration explodes: a merchant you can revisit loops forever, and Rathael's
"ask 9 questions in any order" menu has 9! = 362,880 orderings. Exploration is bounded by
hard guards (`MAX_DEPTH`, `NODE_BUDGET` in `configs.js`) and by **inline dedup that emits `ref`
nodes** — a node that says "this continues at node N" instead of re-expanding the subtree:

- **Text-loop detection** — same dialogue text seen earlier on this root-to-leaf path → cycle
- **Choice+path loop detection** — same choice set at the same Ink path → merchant/shop loop
- **Dialogue-menu hub detection** — whitelisted events (`DIALOGUE_MENU_EVENTS` in `configs.js`)
  get menu children collapsed into refs back to the hub
- **Path convergence** — two routes reaching an identical node share one subtree

```
Without refs (explodes):              With refs:

  Hub ── Q1 ── Hub ── Q2 ── Hub…        Hub ◄────────┐
   ├──── Q2 ── Hub ── Q1 ── Hub…         ├── Q1 (ref ┘)
   └──── Leave                           ├── Q2 (ref ┘)
                                         └── Leave
```

Randomness is normalized as it's encountered: a rolled `GOLD:12` becomes
`GOLD: random [5 - 15]` using the detected ranges, so the tree describes the *distribution*,
not one playthrough's dice.

## Step 2: The post-processing pipeline

Raw trees are correct but not presentation-ready. The `PIPELINE` registry in
`parse-event-trees.js` is the **single source of truth for pass order**; each pass is
`{ name, enabled?, banner?, run(eventTrees, context) }` and can be toggled via `configs.js`.
Current order:

| # | Pass | What it does |
|---|---|---|
| 1 | `sortEvents` | Alphabetical order by name |
| 2 | `filterDefaultNodes` | Drop unreachable `default` branches (blacklisted events only) |
| 3 | `separateChoicesFromEffects` | Split "choice with baked-in outcome" into choice wrapper → outcome node |
| 4 | `normalizeAddKeywordRandomChoiceLabels` | Labels showing one rolled keyword → "Add «random»" |
| 5 | `promoteShallowDialogueMenuHub` | Make the shallowest hub copy canonical, rewire refs to it |
| 6 | `detectAndOptimizeDialogueMenuHubs` | Config-free BFS hub detection for loops the inline pass missed |
| 7 | `deduplicateAllTrees` | Identical subtrees anywhere → refs to the shallowest occurrence |
| 8 | `normalizeRefsPointingToChoiceNodes` | Refs to choice wrappers → the outcome node instead |
| 9 | `normalizeRefsPointingToCombatNodes` | Refs to split combat nodes → the postcombat dialogue child |
| 10 | `convertSiblingAndCousinRefsToRefChildren` | Nearby refs → `refChildren` + sibling reordering |
| 11 | `applyEventAlterations` | Manual per-event fixes (puzzles, boss-death transitions, …) |
| 12 | `checkInvalidRefs` | Sanity check: every ref points at an existing node |
| 13 | `cleanUpRandomValues` | "You gain 12 gold" → "You gain «random» gold" where rolled |
| 14 | `replaceCardIds` | Leftover numeric `[cardid=123]` → card names |

Why choice separation (pass 3) matters for rendering — before and after:

```
Before:                              After:
┌──────────────────────┐             ┌─────────────────┐    ┌─────────────────┐
│ "Open the chest"     │             │ "Open the chest"│ ─► │ "You find gold!"│
│ text: You find gold! │             │ (choice)        │    │ GOLD: 50        │
│ GOLD: 50             │             └─────────────────┘    └─────────────────┘
└──────────────────────┘
```

`ref` vs `refChildren` in the rendered tree:

```
ref:  a jump link back/across            refChildren: converging lines
      (loops, distant duplicates)             (shared outcome of siblings)

  A ── B ── C                             Fight ──┐
        │                                         ├──► "You survive…"
        └── D (ref: B) ─ ─ ─ ► B          Sneak ──┘
```

## Step 3: Output & validation

The trees are written pretty-printed to `src/codex/data/event-trees.json` (never hand-edit it),
then `parse-validation.js` diffs the result against git HEAD (or `--baseline <file>`) and reports
which **events** changed meaningfully — ignoring node-id renumbering and the two known
nondeterministic spots (see below).

## Running it

```bash
# Full pipeline (fetch + extract + parse)
node scripts/sync-events.js

# Parse step only (needs scripts/data/events.json; fetches card names from the API)
node scripts/parse/parse-event-trees.js

# Flags (also forwarded by sync-events.js to the parse step):
node scripts/parse/parse-event-trees.js --debug "Frozen Heart"     # verbose logs for one event
node scripts/parse/parse-event-trees.js --only "Frozen Heart"      # re-parse one event, merge into output
node scripts/parse/parse-event-trees.js --dry-run                  # don't touch the output file
node scripts/parse/parse-event-trees.js --baseline snapshot.json   # validate against a snapshot
```

Typical iteration loop when fixing one event:
`--only "<event>" --debug "<event>" --dry-run`, then drop `--dry-run` once it looks right.

## Known nondeterminism

Two events roll random content *during* story exploration, so their text can differ per run
(both are covered by the validator's ignore rules):

- **Fallen Soldier** — the skeleton sits against a "nearby wall" vs "nearby signpost"
- **Mirror Shard** — the "Focus on the …" choice labels shuffle

Node ids also renumber freely between runs — structurally meaningless and ignored by
validation. Root cause: the id counter is not reset after the last parsed event
(the ids it allocates include exploration nodes that get discarded, a count that can vary
with the story's random rolls), so all post-processing-generated ids can shift by a small
uniform offset per run. `--only` runs number post-processing ids differently than full runs
for the same reason. Verification workflow for code changes lives in
[SPECS.md](./SPECS.md) under "Verification strategy".
