# Event-tree parsing pipeline

Turns the game's own [Ink](https://www.inklestudios.com/ink/) stories into the static
`src/codex/data/event-trees.json` that the Eventmaps tool renders. The whole pipeline is run by
`scripts/sync-events.js`; this folder implements the final (and biggest) step.

## The big picture

There are **two possible sources** for the event data the parse step consumes. The default is an
external event-extraction tool; the in-repo bundle-scraping pipeline is the `--from-dump` fallback.

```
DEFAULT                                  --from-dump (legacy in-repo scrape)

external event-extraction tool           Blightbane website bundle
(outside this repo)                              │
        │                                        │  scripts/fetch-events-data-from-blightbane.js
        │  output pasted in by hand              ▼
        │                                scripts/data/dump.txt      (minified JS bundle)
        │                                        │
        │                                        │  scripts/extract-events.js
        │                                        │  - find JSON.parse('[...]') blobs, keep event types
        │                                        │  - dedupe by caption+text, resolve card/talent ids
        │                                        │    -> names (`ADDTALENT:123` commands and inline
        │                                        │    `<talent=123>` prose tokens)
        │                                        │  - flag DEPRECATED_EVENTS (changing that list needs
        │                                        │    THIS step re-run, not just the parse step)
        ▼                                        ▼
scripts/data/events.json                 scripts/data/events-from-dump.json
        │                                        │
        └────────────────┬───────────────────────┘
                         │   each event's `text` = a compiled Ink story
                         ▼
        scripts/parse/parse-event-trees.js          <── THIS FOLDER
        1. tree building: replay every story path with the inkjs runtime
        2. post-processing: the PIPELINE pass registry (19 passes)
        3. validation: diff output vs baseline, ignore known noise
                         │
                         ▼
        src/codex/data/event-trees.json  (~200 trees, ~4.2k nodes, statically imported)
                         │
                         ▼
        Eventmaps (src/codex/) renders each tree with d3-flextree
```

Both files have the identical shape — an array of `{ name, type, artwork, text, caption,
deprecated }` — so the parse step is agnostic about which one it reads. `events.json` is **not**
written by anything in this repo: the external tool produces it and it is pasted into
`scripts/data/`. That is why `extract-events.js` writes `events-from-dump.json` instead — so a
`--from-dump` run can never clobber the external tool's file. Both are gitignored.

The key idea: instead of parsing Ink's JSON format ourselves, we load each story into the
**official inkjs runtime and play it** — the same way the game does — exhaustively, snapshotting
and restoring story state to explore every choice.

## Module map

| File | Role |
|---|---|
| `parse-event-trees.js` | Entry point: CLI flags, parse loop, the `PIPELINE` pass registry, output writing |
| `tree-building.js` | Ink story exploration → raw tree (`parseInkStory`, `buildTreeFromStory`) |
| `tree-utils.js` | Node creation, node-id counter, generic tree helpers (`countNodes`, node maps) |
| `node-splitting.js` | Effect extraction (`>>>>COMMAND`), text cleaning, combat/dialogue/choice/conditional-variant splitting |
| `random-support.js` | Random value detection (`RANDOM(min, max)`) and normalization to `«random»` |
| `ref-normalization.js` | Rewrite refs to point at the "right" node after structural passes move content |
| `deduplication.js` | Structural subtree dedup (rendering-equivalent subtrees → refs; exact hashing + ref-resolving equivalence; run both mid-pipeline and again post-alterations), plus the duplicate-combat-node merge |
| `ref-children.js` | Sibling/cousin refs → `refChildren` (renders as converging lines) |
| `misc-passes.js` | Invalid-ref check, card-id replacement, default-node filtering |
| `post-processing-hub-pattern-optimization.js` | Config-free BFS detection of dialogue-menu hubs |
| `apply-event-alterations.js` | Engine for manual per-event fixes |
| `event-alterations.js` | The manual fixes themselves (data) |
| `event-overrides.js` | ALL per-event special-casing in one place (hub events, Ink variable overrides, blacklists, aliases, deprecated events, validation ignore rules; re-exports the alterations) |
| `configs.js` | Pass toggles + non-per-event tuning knobs |
| `config-validation.js` | Startup check: every per-event config entry resolves to a real event |
| `parse-validation.js` | Structural output validation against git HEAD or a `--baseline` snapshot |
| `debug.js` | Shared `--debug <event>` state + non-fatal parse-failure registry (summary printed at end of run) |

The scripts are linted and type-checked as part of `npm run verify`: the node shape the
parser produces is the `ParseNode` JSDoc typedef in `tree-utils.js` (a superset of the
app's `EventTreeNode` in `src/codex/types/events.ts`), checked via `tsconfig.scripts.json`.

## Step 0: Config validation (`config-validation.js`)

All per-event special-casing lives in `event-overrides.js` (with the manual tree fixes in
`event-alterations.js`) and is keyed by exact event-name strings. Before any parsing starts,
every configured name — hub events, Ink variable overrides, blacklists, aliases, deprecated
events, validation ignore rules, alterations — is checked against the actual events data (and `hubChoiceMatchThreshold`
against its valid range); an entry that doesn't resolve — an upstream rename or a typo — fails
the run loudly instead of silently not applying. The end of the run also prints a summary of
applied event alterations (including any whose `find` matched nothing) and of non-fatal parse
failures recorded during tree building (degraded random-var/function detection).

## Step 1: Tree building (`tree-building.js`)

Before playing a story, a few static scans of the raw Ink JSON collect what the runtime won't
tell us: random variable ranges (`VAR gold = RANDOM(5, 15)`), function definitions and their
possible return values (random keyword rewards), and *knot* definitions (named sections with
no in-story divert pointing at them — only reachable via an external game-engine trigger
naming the knot to run). `COLLECTOR`/`CARDPUZZLE` name a knot dynamically at runtime, so every
candidate knot is explored as a conditional branch (all of them for `COLLECTOR`; just the
`puzzlesuccess`/`puzzlefail` pair, by naming convention, for `CARDPUZZLE`, since a knot's raw
JSON gives no other way to tell which candidates actually belong to it). `STORYFUNCTION` names
one knot to run for its side effect (a variable assignment) rather than branching on it.
Since none of this is reachable through normal `story.Continue()`/`ChooseChoiceIndex` playback,
a knot's raw JSON is walked directly by `parseKnotContentManually` instead.

### Engine-set variables (`INK_VARIABLE_OVERRIDES`)

A few Ink globals are set by the *game engine*, not by the story, and gate which choices the
runtime offers. inkjs can't know their value, so it evaluates the gate against the `global decl`
default and silently hides every branch behind it. `INK_VARIABLE_OVERRIDES` in
`event-overrides.js` forces such a variable to a fixed value right after the `Story` is
constructed (before the first `Continue()`), and an override naming a variable the story doesn't
declare is a hard error rather than a silent no-op.

The Nexus is the only case: its root runs `STORYFUNCTION:setpicks:nexuscompanions`, where
`nexuscompanions` is an engine-resolved token expanding to the companions the player actually
recruited. `setpicks` is an Ink function but is only ever *called* through that external command,
which inkjs never executes — so `picks` keeps its default of `""` and all 7 "Turn to \<companion\>"
choices (which test it with Ink's `?` substring operator) stay hidden, along with the ~15
containers behind them. Forcing `picks` to a string containing all 7 tokens opens every gate,
which is the right output for a static map that shows every path together with its requirement.

A related case is a variable the engine *reassigns* rather than gates on. The engine calls
`STORYFUNCTION:changeCost:imbueCost`, and `changeCost` assigns its parameter to a global — but
since inkjs never runs that external call, the parameter read is unresolvable (surfacing as the
non-fatal `unresolved knot variable read` warning) and the global keeps its declared default.
That default is then interpolated into everything the player sees, so a stale value is wrong in
several places at once. `ENGINE_ADJUSTED_COST_VARIABLES` + the `replaceEngineAdjustedCosts` pass
(#18) rewrite those sites — see the pipeline table below.

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
- **Dialogue-menu hub detection** — whitelisted events (`DIALOGUE_MENU_EVENTS` in
  `event-overrides.js`) get menu children collapsed into refs back to the hub
- **Menu-return detection** (`menuReturnDetection`) — for menus re-entered with *no text*
  and no stable Ink path, where none of the above can see the loop. The hub's full choice
  set is captured on first visit; a later textless node whose choices are a strict subset
  of it is the same menu again (each visit removes the option just taken) → ref back to the
  hub. Opt-in per event; see The Nexus
- **Path convergence** — two routes reaching an identical node share one subtree

```
Without refs (explodes):              With refs:

  Hub ── Q1 ── Hub ── Q2 ── Hub…        Hub ◄────────┐
   ├──── Q2 ── Hub ── Q1 ── Hub…         ├── Q1 (ref ┘)
   └──── Leave                           ├── Q2 (ref ┘)
                                         └── Leave
```

### `text: "default"` is deliberate, not a parse failure

A node whose Ink content is a bare divert — no prose of its own, just "go back to the options
menu" — gets `text: "default"` as a placeholder (`tree-building.js`, the `safeText` assignments).
Shrine of Night's "Say nothing" is one: its Ink container is only the relative divert `.^.^.^.^`
back to the root's choice list. The Eventmaps renderer understands the placeholder and displays
these nodes correctly, so **a `"default"` node in the output is expected** and shouldn't be
"fixed" by making the parser drop it.

`filterDefaultNodes` (pass 2) *does* delete them, but only for events in `DEFAULT_NODE_BLACKLIST`
(`event-overrides.js`) where the branch is genuinely unreachable rather than just textless — the
pass is opt-in per event for exactly that reason.

Randomness is normalized as it's encountered: a rolled `GOLD:12` becomes
`GOLD: random [5 - 15]` using the detected ranges, so the tree describes the *distribution*,
not one playthrough's dice.

### `>>>` vs `>>>>` command markers

Both marker forms appear in the game's Ink. The distinction is the game's own, and per the
developers' pseudocode:

> the `>>>` is telling the game's parser to read what is next
> and either directly continue if it's `>>>>` or pause if it's `>>>`

So the fourth `>` is a **playback-timing** flag for the game engine — whether the engine runs
straight on after handling the command (`>>>>`) or halts and waits, typically for the player to
acknowledge something (`>>>`).

**For our parser the distinction is irrelevant, and deliberately so.** We build a static map of
every path, not a playback timeline, so "continue vs pause" has no representation in the output.
Every marker regex accordingly matches both forms via `>>>>?` (three `>` plus an optional
fourth) — see `commandSequencePattern` in `node-splitting.js:147`, `cleanText` at line 271, the
combat matcher at line 339 (`(>>>+)?`), and `cmd.replace(/^>>>+/, '')` at line 178. `>>>GOLD:50`
and `>>>>GOLD:50` both extract to `GOLD: 50` with empty leftover text.

Because both forms are treated identically, **bracket count is never the cause of a parsing
problem** — if a command's value is being mangled, look at the value's character class in
`commandSequencePattern`, not at how many `>` it has. (Worked example: `>>>TRADE:&&malignancies&&+3`
used to lose its value because `&` wasn't in that character class, so the match stopped at the
first `&` and the rest fell through into the node's text. Adding `&` and `+` to the class fixed
it — with four brackets it had behaved identically.)

### Conditional text variants (`[?condition]`)

The game marks a line whose display depends on runtime state with `[?condition]` —
`[?questflag:nathali]`, `[?!questflag:nathali]`, or a compound
`[?testresult:sealed;questflag:nathali]` (all conditions must hold). The engine shows **exactly
one** of a run of such lines, but inkjs can't know the state and emits every variant into the same
node — so stripping the markers and keeping all the prose concatenates mutually exclusive outcomes
into one passage (Shrine of Absence's three `LIGHTLESSTEST` results read as one contradictory
paragraph).

`splitTextOnConditionalVariants` + `splitNodeOnConditionalVariants` (`node-splitting.js`) give each
variant its own child node carrying its condition as a **requirement**, reusing the `NOT ` prefix
convention from choice requirements. The rules, and the reason each is not the obvious choice:

- **Leading text** stays on the parent, and **the parent's real children stay its children**, as
  siblings of the variants. Copying them onto each variant puts them behind a requirement they
  don't have, and dedup then collapses the copies — losing choices outright.
- **When those children are choices**, the variants are alternative *intro* prose for the menu
  (Alchemist's shopkeeper greetings, Spot in the Shade's arrival lines): one greeting is read, then
  the same menu is picked from. Each variant becomes an additional parent of the shared choice set
  via `refChildren`. As terminal leaves instead, every greeting reads as a dead end while the menu
  hangs off the parent as unrelated siblings.
- **Trailing text** after the last marked line is an epilogue appended to every variant, *unless*:
  - the marked line carries `[continue]` **and prose of its own** — then it continues that variant.
    Both halves matter: a `[continue]` marker holding only a command (Alchemist) must not claim the
    line below it, or you get a duplicate variant holding prose that isn't conditional at all.
  - the marked lines are competing alternatives for one slot rather than barks on a shared scene
    (`marksAlternativesForOneSlot`) — then it becomes its own sibling, the fallback for whoever
    matched none of them. The tell is a conditional line **setting a quest flag its own siblings are
    gated on**: recording "the intro has been shown" only means anything if the marked and unmarked
    lines fill the same slot. Alchemist is the only such event (audited across all 203, 2026-08-03);
    everywhere else trailing prose is the scene continuing for everyone.
- **A command on a conditional line moves to that variant** and comes off the node's own effects —
  it only fires under that line's condition. On the node it would read as applying to everyone,
  including players who matched no marker, and as being checked by the very children it gates. A
  command on a *prose-less* conditional line attaches to the variant sharing its condition; one
  matching no variant stays on the node rather than being dropped.
- Variant and parent text go through `extractEffects`, not `cleanText`, or a command sharing the
  line leaks its value in as prose (`>>>>ADDTALENT:Clarity of Mind` → a node reading `"of Mind"`).
- A marker with **empty prose** is dropped; **fewer than 2** content-carrying variants is a
  conditional aside, not a branch, and is left inline.

The fallback sibling gets **no requirements from the parser**. Its real condition is the negation of
all the others, but the Ink never states it — and `[?…]` is the game engine's mini-language, not Ink
syntax, so deriving the negation needs boolean simplification over opaque game-state strings.
Where that inference is worth making it belongs in `event-alterations.js`, which tags the node
`altered: true`; see the Alchemist entry, whose added `NOT` requirements also drop its link to the
contradicting choice for free (pass 15 filters `refChildren` against contradictions, and runs after
alterations).

Three call sites in `tree-building.js` need the split, because leaf nodes and cycle-ref nodes return
early before the main splitting section: a leaf can hold several outcomes, and a ref node's variants
all jump back to the same target so each carries its own copy of the ref.
`detectAndOptimizeDialogueMenuHubs` also has to keep variant children when it collapses a repeated
menu — Absence's Investigate branch has the root's choice set but its own companion barks.

#### Engine tests → `special` + `result`

`>>>LIGHTLESSTEST` names no knot but *does* branch: the engine runs a test and reports which outcome
it picked back through `[?testresult:<outcome>]` conditionals. Same "engine picks one of N outcomes"
semantics as `COLLECTOR`/`CARDPUZZLE`, so it gets the same `special` → `result` structure.
`ENGINE_TEST_COMMANDS` maps such a command to the flag its outcomes are keyed on; unlike
`detectBranchingCommand` the outcomes are conditional lines in the same container, not separate
knots, so they can't be found by walking knot definitions.

Variants are **grouped by outcome**, not mapped one-to-one: a compound condition adds a further
condition to an outcome rather than naming a new one, so Absence's `sealed` and
`sealed;questflag:nathali` are one outcome plus a companion remark — three outcomes, not five. (The
absence of a negated `!questflag` sibling is how this ink distinguishes that from genuine either/or.)
Within a result the unconditional prose comes first and each conditional addition hangs off it as a
child carrying its own condition; `ResultNode` has no `text` field, so prose always lives in
children.

This depends on dialogue/end nodes rendering a requirements box (`isRequirementsNode` in
`src/codex/utils/eventNodeDimensions.ts`) — without it the remark's condition is in the data but
invisible in the tree. And like `COLLECTOR`/`CARDPUZZLE`, an engine-test `special` node keeps its own
`choiceLabel`: `separateChoicesFromEffects` deliberately skips `special` nodes.

### Counter-reference values (`&&counter&&±N`)

The game wraps a runtime counter reference in `&&`, so `TRADE:&&malignancies&&+3` means "trade
for (number of malignancies) + 3" — confirmed with the developers as a formatting convention, not
a parser bug. `resolveCounterReferenceValue` in `node-splitting.js` rewrites it to the readable
effect `TRADE: [malignancies] + 3`.

`&&malignancies&&+3` in Dreampod is the **only** occurrence in the dataset, so this is a narrow
single-pattern rewrite rather than a general `&&…&&` mini-language. A value that doesn't match the
shape passes through untouched, so a second, differently-shaped counter surfaces as a raw value
instead of being silently mangled.

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
| 7 | `deduplicateAllTrees` | Rendering-equivalent subtrees anywhere → refs to the shallowest occurrence. Equivalence resolves refs (a ref stub matches the expansion it points at) via a cycle-safe comparison, fast-pathed by exact bottom-up subtree hashing; the duplicate's own requirements/effects/numContinues may differ (they survive on the ref node); repeats until no pass finds anything |
| 8 | `normalizeRefsPointingToChoiceNodes` | Refs to choice wrappers → the outcome node instead |
| 9 | `normalizeRefsPointingToCombatNodes` | Refs to split combat nodes → the postcombat dialogue child |
| 10 | `convertSiblingAndCousinRefsToRefChildren` | Nearby refs → `refChildren` + sibling reordering |
| 11 | `hoistPureStandInRefNodes` | Stand-in refChildren nodes that are pure copies of their target (and only children) are deleted; the parent's converging line goes directly to the original |
| 12 | `applyEventAlterations` | Manual per-event fixes (boss-death transitions, door/room structure, …). Every added/edited node is tagged `altered: true`, on the shallowest altered node only — descendants inherit the meaning. Not the only pass that sets the tag; see #18 |
| 13 | `deduplicateAllTreesPostAlterations` | Pass 7 again: alterations can grow previously-too-small subtrees past the dedup size gate (boss transitions turn each duplicated `choice → combat` pair into an eligible 3-node chain), so identical chains collapse at the choice level |
| 14 | `mergeDuplicateCombatNodes` | Duplicate combat nodes pass 13 can't catch (copies behind non-identical choice wrappers, whose chains stay below the size gate) → `ref` jump links to the shallowest copy; identical on ALL fields incl. requirements/effects, since a combat node's effects are the fight. Childless copies stay — merging a leaf removes no nodes |
| 15 | `linkConditionalVariantsToSharedChoices` | Conditional-variant intro prose → `refChildren` on its parent's choice nodes. **Must stay last of the structural passes**: it reads sibling ids, and every pass above still renumbers or replaces nodes — resolving these ids during tree building produced `refChildren` pointing at nodes that no longer existed (Brightcandle Inn, Vaelmorin, Shrine of Absence). A marked variant whose menu a later pass collapsed drops the marker and keeps the `ref` it already carries |
| 16 | `checkInvalidRefs` | Sanity check: every ref points at an existing node |
| 17 | `cleanUpRandomValues` | "You gain 12 gold" → "You gain «random» gold" where rolled |
| 18 | `replaceEngineAdjustedCosts` | Costs the game engine reassigns at runtime → `<?>` + the real escalation series, so the story's declared default stops reading as a fixed price. Tags the choice/outcome nodes it rewrites `altered: true` (not the node whose internal `SET` placeholder it tidies) |
| 19 | `replaceCardIds` | Leftover numeric `[cardid=123]` → card names |

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
then `parse-validation.js` compares the result **structurally** against git HEAD (or
`--baseline <file>`) and reports which **events** changed meaningfully. Both versions are
deep-normalized before comparison: `id` fields are stripped, each `ref`/`refChildren` value is
replaced with a descriptor of its *target node* (path from root + text/choiceLabel), and the
known nondeterministic text (see below) is masked per event. Node-id renumbering is therefore
invisible, but a ref that silently starts pointing at a different target node — or a subtree
collapsing into a ref — is caught. Failing events are reported with the path of the first
differing node.

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

1. **Before starting a change**: regenerate `event-trees.json` with the *current* script and
   commit it, so the baseline reflects what today's code actually produces (including current
   API data). The `--baseline <file>` flag lets a saved snapshot file replace the commit step.
2. Make the change, re-run `node scripts/parse/parse-event-trees.js`.
3. `validateEventTreesChanges()` must report **zero** events for pure refactors. For
   behavior-changing work, review every reported event deliberately and spot-check it in the
   Eventmaps dev server (per the repo's visual-verification policy).
4. After a verified step, re-commit the regenerated output so the next step diffs against a
   clean baseline.

**Former blind spot, now closed:** the old line-diff validator ignored *all* `ref` changes
(necessarily, since ids renumber), so a ref moving to a different target node, or a subtree
collapsing into a ref, could pass validation unseen. The structural validator compares refs by
*target descriptor* (path + text/choiceLabel), so id renumbering stays invisible while target
changes are caught.

**Nondeterminism audit (cheap, one-off):** run the parser twice back-to-back with no code
changes and diff the two outputs. That empirically enumerates the full non-deterministic
surface and confirms the documented ignore rules still cover all of it — worth doing again if
the game data updates significantly.

> Audit result (2026-07-18): the non-deterministic surface has **three** classes, all covered
> by the validator's ignore rules:
> 1. **Fallen Soldier** — oxidised-skeleton text ("nearby wall" / "nearby signpost" /
>    "nearby stone"; 4 values exist, see spec 20 — the audit only happened to roll two of them)
> 2. **Mirror Shard** — "Focus on the ..." label shuffling
> 3. **Post-processing id shifts** — the id counter is not reset after the last parsed event,
>    and the number of ids that event allocates (including discarded exploration nodes) varies
>    with random rolls; when it does, every post-processing-generated id shifts by a uniform
>    offset, producing byte diffs in ~46 events with zero structural change. This class did
>    NOT show up in the first two-run audit (the counts happened to match) and was only
>    discovered during later verification — byte-level comparison is therefore not a reliable
>    pass/fail signal on its own; use the validator or a ref-target-aware structural diff.
>    (`--only` re-parses shift post-processing ids for the same reason.)

## Running it

```bash
# Default: parse scripts/data/events.json (from the external event-extraction tool).
# This is parse-only — nothing fetches or generates events.json, so put the tool's
# output at that path first. Fails with a clear message if the file is missing.
node scripts/sync-events.js

# Legacy in-repo source: fetch the Blightbane bundle + extract + parse.
# Writes scripts/data/events-from-dump.json and parses that; events.json is untouched.
node scripts/sync-events.js --from-dump

# Via npm, the `--` separator is REQUIRED:
npm run sync-events -- --from-dump

# Parse step only (card/talent names come from the cached scripts/data/card-id-mapping.json
# written by extract-events.js, so this runs offline — falls back to a live API fetch when
# the cache is missing)
node scripts/parse/parse-event-trees.js

# Flags (also forwarded by sync-events.js to the parse step):
node scripts/parse/parse-event-trees.js --debug "Frozen Heart"     # verbose logs for one event
node scripts/parse/parse-event-trees.js --only "Frozen Heart"      # re-parse one event, merge into output
node scripts/parse/parse-event-trees.js --dry-run                  # don't touch the output file
node scripts/parse/parse-event-trees.js --baseline snapshot.json   # validate against a snapshot
node scripts/parse/parse-event-trees.js --from-dump                # read events-from-dump.json
```

Typical iteration loop when fixing one event:
`--only "<event>" --debug "<event>" --dry-run`, then drop `--dry-run` once it looks right.

That loop only covers changes to *this* folder. `event-overrides.js` also exports
`DEPRECATED_EVENTS`, which is read by `extract-events.js` — a change to it takes effect only
after `node scripts/extract-events.js` re-writes `scripts/data/events-from-dump.json`, since the
parse step just copies the flag from there. That step always fetches the Blightbane API live, so
snapshot `events-from-dump.json` first and diff after to keep unrelated upstream changes out of
the commit. Note this only affects the `--from-dump` path: on the default path the `deprecated`
flag comes from the external tool's `events.json`, so `DEPRECATED_EVENTS` has no effect there.

## Known nondeterminism

Two events roll random content *during* story exploration, so their text can differ per run
(both are covered by the validator's ignore rules — `VALIDATION_IGNORE_RULES` in
`event-overrides.js`, scoped per event):

- **Fallen Soldier** (Ink event name `ArmsDealer`) — the skeleton sits against a "nearby wall",
  "nearby signpost" or "nearby stone". Root cause: an inline Ink cycle-alternative (`seq`)
  construct picking one of 4 flavor-text values mid-sentence, not yet detected by any code path
- **Mirror Shard** — the "Focus on the …" choice labels shuffle

Node ids also renumber freely between runs — structurally meaningless and ignored by
validation. Root cause: the id counter is not reset after the last parsed event
(the ids it allocates include exploration nodes that get discarded, a count that can vary
with the story's random rolls), so all post-processing-generated ids can shift by a small
uniform offset per run. `--only` runs number post-processing ids differently than full runs
for the same reason. Verification workflow for code changes lives above, under
["Verification strategy"](#verification-strategy).
