# Parsing findings — Nexus of Nightmares sync

Issues found after syncing the **Nexus of Nightmares** content drop (Blightbane bundle
`v0.22.18`, 183 → 201 events). Each item is independent; work through them one at a time.

## Working conventions

- **Mark a finished item `COMPLETED`** — keep the section, don't delete it. Put the marker in
  the heading and replace the section's `**Status:**` line with what was actually done
  (including anything that turned out differently from the plan below it). The finished
  sections are the record of how this sync was worked through.
- **If a change contradicts [README.md](./README.md), update the README in the same change.**
  That file documents the pipeline's behaviour — pass order and count, the module map, the
  known-nondeterminism list, the verification workflow, `configs.js` knobs. A change that
  makes any of it wrong isn't done until the README matches. The same goes for a finding
  below that turns out to be mistaken: correct it rather than leaving it to mislead the next
  reader.

## Items

Suggested order — cheapest and most certain first, Broken Vault last since it needs the most
back-and-forth:

| # | Item | Size | Blocked by |
|---|---|---|---|
| 1 | [Strange Light — mark as deprecated](#1-strange-light--mark-as-deprecated--completed) | ~~one line~~ + re-extract | ✅ COMPLETED |
| 2 | [Vaelmorin — unresolved `<talent=617304>`](#2-vaelmorin--unresolved-talent617304-in-text--completed) | ~~small~~ + re-extract | ✅ COMPLETED |
| 3 | [Dreampod — `&&malignancies&&+3` codeword](#3-dreampod--malignancies3-codeword-in-text) | small | needs a game-side answer |
| 4 | [The Nexus — `setpicks:nexuscompanions`](#4-the-nexus--setpicksnexuscompanions-hides-7-branches) | medium | — |
| 5 | [Broken Vault — node-budget blowout](#5-broken-vault--node-budget-blowout-do-this-last) | large | — |

Re-run after each: `node scripts/parse/parse-event-trees.js --only "<event>" --debug "<event>" --dry-run`,
then drop `--dry-run`, then `npm run verify`.

⚠️ That's enough only for changes inside `scripts/parse/`. If the change touches something
`extract-events.js` reads — `DEPRECATED_EVENTS` is the one in `event-overrides.js` — run
`node scripts/extract-events.js` first, or the parse step will report no change at all
(see item 1).

---

## 1. Strange Light — mark as deprecated ✅ COMPLETED

**Status:** done. `'Strange Light'` added to `DEPRECATED_EVENTS` in
[`event-overrides.js:126`](./event-overrides.js):

```js
const DEPRECATED_EVENTS = ['Mirror Shard', 'Robed Figure', 'Iron Gates', 'Strange Light']
```

The flag then flows through on its own: `extract-events.js:145` sets `deprecated = true` on the
extracted event → `parse-event-trees.js:547` copies it onto the tree →
`EventTree.deprecated?: boolean` (`src/codex/types/events.ts:10`) is already consumed by the app
(`EventTree/index.tsx:324`), so no app-side change was needed.

`config-validation.js:40` validates the name against the events data, so a typo fails the run
loudly. The name must match the caption exactly: `Strange Light`.

### ⚠️ It was not a one-line change: re-run extraction, not just the parse step

This item was filed as "one line," but the one line alone changes nothing. **`DEPRECATED_EVENTS`
is consumed by `extract-events.js`, not by the parse step.** The flag is baked into
`scripts/data/events.json` during extraction, and the parser only *copies* it from there. So:

```bash
node scripts/extract-events.js            # ← required; bakes deprecated:true into events.json
node scripts/parse/parse-event-trees.js
```

The re-run command in the preamble above (`parse-event-trees.js --only "<event>"`) would have
silently produced no change at all. **Any future edit to `DEPRECATED_EVENTS` — or to anything
else `extract-events.js` reads — needs the extract step re-run first.**

Note `extract-events.js` always fetches the Blightbane API live (only the parse step uses the
cached mapping), so it can pull in unrelated upstream name changes. Snapshot
`scripts/data/events.json` first and diff after, to confirm the only change is the one intended.
Here the diff was exactly `deprecated: true` on Strange Light — no API drift.

### Verified

- Structural validator, full run: **Strange Light the only event with a meaningful diff**, and
  only `deprecated: <absent> → true`
- 4 deprecated trees now (Iron Gates, Mirror Shard, Robed Figure, Strange Light); 201 total
- Renders with the deprecated treatment in Eventmaps like `Mirror Shard` does (manually confirmed)
- `npm run verify` clean; `npm run build` prerenders all 201 event pages

The committed `event-trees.json` diff also contained the two known nondeterministic events
(Fallen Soldier's skeleton text, Mirror Shard's label order) — expected noise, correctly ignored
by the validator. Fallen Soldier rolled a **"nearby stone"** variant this run, a third value
beyond the "wall"/"signpost" pair the README's audit note lists; consistent with the 4-value
`seq` construct of spec 20, and the ignore rule's prefix match covers it either way.

---

## 2. Vaelmorin — unresolved `<talent=617304>` in text ✅ COMPLETED

**Status:** done, implemented as the fix sketch below recommended — in `extract-events.js`,
alongside `INLINE_CARD_ID_COMMAND_REGEX`, so the token is resolved in the raw Ink before
parsing and both the narrative text and the choice label come out clean.

The pattern lives next to the command list it parallels, in
[`shared/card-data.js`](../shared/card-data.js):

```js
// a getter, not a const: a /g regex carries lastIndex, so a shared object would make
// any future .test()/.exec() use stateful across events
const inlineCardIdTokenRegex = () => /<(?:card|talent)=(\d+)>/g
```

`extract-events.js` applies it right after the command replacement, resolving to the bare
name (these tokens are prose, not effects — there's no command to preserve) and feeding
misses into the **same `unresolvedIds` set**, so a genuinely unknown id still surfaces as
`MISSING NAME [id: N]` rather than passing through silently. Both `card` and `talent` are
matched even though only `talent` occurs today — one alternation, no speculative structure.

### ⚠️ Like item 1, this needed the extract step re-run

`extract-events.js` bakes the resolved text into `scripts/data/events.json`; the parse step
only reads it. So `--only "Vaelmorin…"` alone would have reported no change:

```bash
node scripts/extract-events.js            # ← required
node scripts/parse/parse-event-trees.js
```

Extraction always fetches the Blightbane API live, so `events.json` was snapshotted first and
diffed after: **exactly one line changed** (the Vaelmorin event), both tokens → `Clarity of Mind`.
No upstream API drift. Note `scripts/data/` is gitignored, so this snapshot has to be taken by
hand — there's no `git diff` fallback.

### Verified

- Structural validator, full run: **`Vaelmorin, the Ancient Death` the only event with a
  meaningful diff**, and only the intended one:
  `choiceLabel: "Talent: Gain <talent=617304>" → "Talent: Gain Clarity of Mind"`
  (the narrative-text node changed too, but it sits inside an unchanged-shape subtree)
- `grep -c '<talent=\|<card=' src/codex/data/event-trees.json` → **0**
- Both originally-broken nodes now read `Clarity of Mind`; the sibling `ADDTALENT: Clarity of
  Mind` effect on the same node is unchanged, as expected
- Unresolved card/talent ids at extraction: **0**
- `npm run verify` clean

### Follow-up: the whole `unrecognized command` warning class cleared ✅

Vaelmorin also emitted a non-fatal `unrecognized command` warning, **unrelated** to the token
syntax and pre-existing:

```
"IMBUE" is not in KNOWN_COMMANDS      (node-splitting.js:200)
```

The `c-8` branch is a bare `>>>IMBUE` (no value) — the sole occurrence in the dataset. It was
already rendering correctly as the effect `"IMBUE"`; the missing registry entry only meant the
command wasn't *recognised*, which is precisely the upstream-drift signal `KNOWN_COMMANDS`
exists to raise.

Enumerating the rest of the class turned up three more, each a real, safe command from the same
content drop. **All four are now registered** in
[`node-splitting.js`](./node-splitting.js):

| Command | Event(s) | Renders as |
|---|---|---|
| `IMBUE` | `Vaelmorin, the Ancient Death` | effect `IMBUE` |
| `NATHALIMERCHANT` | `Nathali`, `Nathali Brightcandle` | effect `NATHALIMERCHANT` |
| `RANDOMEVENT` | `Dreampod` | effect `RANDOMEVENT` |
| `DELVEFROMANYPROPERTY` | `Vault Door` | effect `DELVEFROMANYPROPERTY` |

**These are registry entries only.** Registering a command silences the warning and nothing
else — each one already appeared in the tree and still appears there unchanged. The
`unrecognized command` failure class is now **empty**; the remaining non-fatal warnings are
`unresolved knot variable read` (`Enchanter`, `The Nexus` — item 4) and `bare-colon command`
(`Dreampod` — item 3).

---

<details>
<summary>Original diagnosis (kept for the record)</summary>

**Status:** cause confirmed. **This is a parser gap, not missing database data.**

> Correcting my earlier report: I originally said this was missing from the talents database and
> needed a DB sync first. That was wrong — the id resolves fine. No sync is needed.

In `Vaelmorin, the Ancient Death`, two nodes show the raw token instead of the talent name:

```
[68453] "Then take this kindness with you: I offer you <talent=617304> - or, if you would
         rather, an enchantment bound forever to your soul."
[2277]  ▸ Talent: Gain <talent=617304>
```

**The id is already in the mapping** — `scripts/data/card-id-mapping.json` has
`"617304": "Clarity of Mind"` (3102 entries, fetched live by `extract-events.js`). Proof that
resolution works elsewhere: the *effect* on the very same node resolved correctly to
`"ADDTALENT: Clarity of Mind"`.

The gap is the **inline `<talent=N>` angle-bracket syntax in narrative text**. Existing
resolution only covers two shapes:

- `INLINE_CARD_ID_COMMANDS` in [`shared/card-data.js`](../shared/card-data.js) — rewrites
  `COMMAND:123` (e.g. `ADDTALENT:617304`) in the raw Ink before parsing
- the `replaceCardIds` pass (pipeline #17) — handles leftover `[cardid=123]` in extracted effects

Neither matches `<talent=617304>`. This is a **new text syntax** in this content drop:
`<talent=N>` occurs 2× in the whole file and `<card=N>` 0×, so it's newly introduced upstream.

**Fix sketch:** extend the inline replacement to also match `<talent=(\d+)>` and `<card=(\d+)>`.
Decide where — doing it in `extract-events.js` alongside `INLINE_CARD_ID_COMMAND_REGEX` fixes it
before parsing (so choice labels and text are both clean); doing it in `replaceCardIds` catches
it later but that pass currently only walks effects. Prefer the former for consistency with how
`ADDTALENT:N` is already handled.

Watch out for the **unresolved-id reporting path**: `extract-events.js` tracks unresolved ids and
emits `MISSING NAME [id: N]`. Currently 0 occurrences — make sure a genuinely unknown
`<talent=N>` still surfaces there rather than silently passing through.

**Verify:** both occurrences read `Clarity of Mind`; `grep -c '<talent=' src/codex/data/event-trees.json`
returns 0.

</details>

---

## 3. Dreampod — `&&malignancies&&+3` codeword in text

**Status:** mechanism identified; needs a decision on how to render it.

In `Dreampod`, the "Place a card in the pod" branch has a node whose **entire text body** is the
raw codeword:

```
▸ Place a card in the pod
    &&malignancies&&+3          EFFECTS=["TRADE"]
```

Raw Ink (`scripts/data/events.json`):

```json
"c-1": ["^>>>TRADE:&&malignancies&&+3", "end", ...]
```

### Root cause: the `&` character, *not* the three brackets

> An earlier draft of this section guessed the three-bracket `>>>TRADE:` marker was implicated.
> **That is ruled out.** `>>>` vs `>>>>` is a game-engine playback-timing flag (continue vs
> pause) that our parser deliberately ignores — every marker regex matches both via `>>>>?`.
> See ["`>>>` vs `>>>>` command markers"](./README.md#-vs--command-markers) in the README.
> Verified directly: `>>>TRADE:…` and `>>>>TRADE:…` produce byte-identical output.

The actual cause is the **command-value character class** in `commandSequencePattern`
([`node-splitting.js:147`](./node-splitting.js)):

```js
const commandSequencePattern = />>>>?[A-Za-z0-9_:;'\[\]\(\) \t\/\-]+/gi
```

`&` is not in that class, so the match stops at the first `&`. The command name `TRADE` is
consumed and emitted as an effect, and everything from `&&…` onward falls through into the
node's text. Confirmed by calling `extractEffects` directly:

```
">>>TRADE:&&malignancies&&+3"  => { effects: ["TRADE"], cleanedText: "&&malignancies&&+3" }
">>>>TRADE:&&malignancies&&+3" => { effects: ["TRADE"], cleanedText: "&&malignancies&&+3" }
```

Both also trip the `bare-colon command failed` parse failure (`TRADE:` with nothing after the
colon) — which is exactly the non-fatal `Dreampod` warning seen in the sync output.

### The remaining unknown: what `&&x&&±N` means

`&&keyword&&±N` appears **exactly once** in the entire dataset
(`grep -o '&&[a-zA-Z_]*&&[+-]\?[0-9]*'` → 1 hit), so there's no second example to generalise
from. Read against the sibling choices (`decksize:1;Place a card in the pod`), it most plausibly
means *trade a card for +3 Malignancies*.

**Confirm before implementing:** is `&&x&&±N` a general "modify counter x by N" syntax, or a
one-off? Ask in the Dawncaster Discord / check a future bundle. Guessing wrong is cheap to undo
but would bake a wrong abstraction into the splitter.

**Fix sketch:** add `&` (and `+`) to the `commandSequencePattern` character class so the value
survives, then parse it into a structured effect (e.g. `TRADE: +3 Malignancies`) so the node
renders prose or a proper effect chip instead of a raw codeword. Whatever the shape, a node
whose only text is a codeword should never reach the rendered tree.

⚠️ **Widening that character class is a global change** — it affects command extraction for all
201 events, so it's the kind of edit that needs a full-run structural diff
(`validateEventTreesChanges`) rather than an `--only` spot-check. Note `+` is currently absent
too, so `&&malignancies&&+3` needs both.

**Related:** per the repo's "avoid generic abstractions with a single consumer" rule — with one
occurrence, prefer a narrow concrete handler over a general `&&…&&` mini-language until a second
case shows up.

---

## 4. The Nexus — `setpicks:nexuscompanions` hides 7 branches

**Status:** investigated, **and the fix is empirically verified** (see "Proof" below).
**Approach: extend the parser with a `picks` hardcode — not event-alterations, and not the
COLLECTOR knot mechanism.**

> Two corrections to earlier drafts of this section:
> - It's **7** branches, not 6 — `merchant` → "Turn to Julius" was missed. That's what strands
>   the `julius`/`juliusservices` containers.
> - "Same class as COLLECTOR/CARDPUZZLE, treat `picks` like the existing dynamic-knot cases"
>   was **wrong** and would send you down a dead end. COLLECTOR expands *orphan knots*; the
>   companion content isn't in knots at all. Details under "Why COLLECTOR doesn't transfer".

The Nexus root node carries:

```
EFFECTS = ["STORYFUNCTION: setpicks:nexuscompanions", "SET picks = <p>"]
```

### What it actually does

`setpicks` is an **Ink function**, defined at the end of the story:

```json
"setpicks": [{"temp=":"p"}, "ev", {"VAR?":"p"}, "/ev", {"VAR=":"picks","re":true}, ...]
```

It takes one argument and assigns it to the global variable `picks`. So
`STORYFUNCTION:setpicks:nexuscompanions` simply means **`picks = "nexuscompanions"`**.

Per the README, `STORYFUNCTION` names one knot to run for its side effect (a variable
assignment) rather than branching on it — which is exactly what happened. That part is working
as designed.

### Why it matters

`picks` is read **7 times**, once per companion choice, all inside the `lookaround` container:

```json
{"VAR?":"picks"}, "str", "^priest",      "/str", "?"   → "questflag:priest;Turn to Viola"
{"VAR?":"picks"}, "str", "^alchemist",   "/str", "?"   → "questflag:alchemist;Turn to Theresa"
{"VAR?":"picks"}, "str", "^succubus",    "/str", "?"   → "questflag:succubus;Turn to Serena"
{"VAR?":"picks"}, "str", "^illusionist", "/str", "?"   → "questflag:illusionist;Turn to the Count"
{"VAR?":"picks"}, "str", "^enchanter",   "/str", "?"   → "questflag:enchanter;Turn to Bolgar"
{"VAR?":"picks"}, "str", "^nathali",     "/str", "?"   → "questflag:nathali;Turn to Nathali"
{"VAR?":"picks"}, "str", "^merchant",    "/str", "?"   → "questflag:merchant;Turn to Julius"
```

`?` is Ink's **substring/contains** operator, used uniformly by all 7 (no `==`/`!=` variants).

**`picks` is empty at the decision point.** The `global decl` initialises it to `""`, and
although `setpicks:nexuscompanions` runs at the root, by the time the `lookaround` choices are
evaluated the runtime reports `picks = ""`. Either way no token matches, so inkjs offers **none**
of the 7 choices. Result — the parsed tree has only 2 root children:

```
The Dreamwell lies still as glass…
  ▸ Look around
      ▸ Leave: We have lingered here long enough.
  ▸ Skip: We have no time for this.
```

Missing: all 7 "Turn to \<companion\>" branches and everything behind them —
`violaservices`, `theresa`, `theresaservices`, `serena`, `serenaservices`, `vesparin`,
`vesparinservices`, `vesparinexplain`, `vesparinvault`, `vesparincopy`, `bolgarservices`,
`nathali`, `nathaliservices`, `julius`, `juliusservices` — plus the two stranded merchant
markers `>>>>NATHALIMERCHANT` and `>>>>MERCHANT`.

`nexuscompanions` is a **game-engine-resolved token**: the engine expands it into the list of
companions the player actually recruited. The Ink JSON alone can't tell us that list.

### Why COLLECTOR doesn't transfer

The instinct to reuse the `COLLECTOR`/`CARDPUZZLE` machinery is wrong here. Those work by
expanding **orphan knots** — top-level named sections with no in-story divert, walked directly
by `parseKnotContentManually`. The Nexus has only three top-level knots, all helper functions:

```
TOP-LEVEL KNOT NAMES: [ 'setpicks', 'changeCost', 'global decl' ]
```

The companion content lives one level down as ordinary named containers under `root[0]`
(`lookaround`, `violaservices`, `julius`, …), reached by normal diverts from the gated choices.
So `detectBranchingCommand` / `parseKnotContentManually` have nothing to grab.

`STORYFUNCTION` handling (`tree-building.js:706-720`) is meanwhile **already correct** — it
merges the assignment's effect and deliberately doesn't branch. Don't "fix" it.

### Proof: hardcoding `picks` unlocks everything

Verified directly against the inkjs runtime. Set `picks` to a string containing all 7 tokens
*after* entering `lookaround` (setting it before the first `Continue()` does **not** work —
`setpicks` runs during that call and overwrites it):

```js
const s = new Story(JSON.parse(event.text))
while (s.canContinue) s.Continue()
s.ChooseChoiceIndex(0)                     // "Look around"
s.variablesState['picks'] = 'priest alchemist succubus illusionist enchanter nathali merchant'
while (s.canContinue) s.Continue()
```

All 7 choices appear, and every branch yields full dialogue plus its own sub-choices:

```
[0] questflag:priest;Turn to Viola      → "The priestess does not kneel to look…"  (2 sub-choices)
[1] questflag:alchemist;Turn to Theresa → "The alchemist crouches at the water's…" (2 sub-choices)
[2] questflag:succubus;Turn to Serena   → "The demon spares the rising lights…"    (2 sub-choices)
[3] questflag:illusionist;Turn to Count → "The Count studies the rising dreams…"   (2 sub-choices)
[4] questflag:enchanter;Turn to Bolgar  → ">>>>STORYFUNCTION:changeCost:imbueCost…"(2 sub-choices)
[5] questflag:nathali;Turn to Nathali   → "Nathali stands apart from the others…"  (2 sub-choices)
[6] questflag:merchant;Turn to Julius   → "Julius has unfolded a portable ledger…" (2 sub-choices)
[7] Leave: We have lingered here long enough.
```

**So yes — hardcoding "all companions available" is sufficient.** `picks` is the only gate:
the other 8 variables read by this story (`cleanseCost`, `healCost`, `vaultcost`, …) are all
numeric costs with sensible non-zero defaults in `global decl`, gating nothing.

The exact string doesn't matter as long as it contains all 7 tokens as substrings — space- or
comma-separated both work, since `?` is a plain substring test.

### Fix sketch

Set `picks` to the all-tokens string during exploration, then let the existing engine do the
rest. Two things fall out for free:

- **The recursion pulls in all ~15 containers automatically** — you're unblocking content, not
  hand-writing it.
- **Requirements self-annotate**: each label is already prefixed `questflag:priest;…`, which the
  existing requirement parsing handles.

Placement matters: it must apply after `setpicks` has run. Cleanest is probably a per-event
variable-override hook in `event-overrides.js` (e.g. `INK_VARIABLE_OVERRIDES`) applied by
`tree-building.js` during exploration, reasserted after `STORYFUNCTION` effects are processed.

**Keep it narrow.** `setpicks:nexuscompanions` occurs exactly once in the dataset — per the
repo's single-consumer rule, prefer a concrete per-event override over a general
variable-gating framework until a second case appears.

### Why not event-alterations

`event-alterations.js` is find-and-patch on an existing tree. Going that route means
hand-authoring ~15 containers of dialogue, choices, effects and merchant hooks that already
exist verbatim in the Ink — the largest alteration in the file by a wide margin, frozen against
upstream and silently rotting the moment the game edits Nathali's or Julius's lines. Alterations
earn their keep for structure the runtime *can't* produce (boss-death transitions, door/room
shape); this is content the runtime produces perfectly the instant the gate opens.

### Caveats

- **Watch for explosion.** 7 branches with services/merchant sub-menus is the shape that blows
  `NODE_BUDGET` — `vesparin*` alone is 5 containers. Have a `DIALOGUE_MENU_EVENTS` entry ready.
  Worth doing *after* Broken Vault, since that work builds exactly this intuition.
- **Open question (same one as item 3):** does real gameplay ever offer all 7 at once, or only
  recruited companions? For a static map that shows every path with its requirement, showing all
  7 is right either way — but worth a Discord check.

**Verify:** `Look around` gains 7 companion choices, each showing its quest-flag requirement;
the Julius / `NATHALIMERCHANT` / `MERCHANT` content appears; no node-limit warnings.

---

## 5. Broken Vault — node-budget blowout (do this last)

**Status:** diagnosed, not started. Agreed approach: **solve it the way Rathael was solved.**

This is the badly broken one. It's last because it'll take the most iteration.

### Symptoms

```
⚠️  Event "Broken Vault" reached node limit (30000) at depth 11, 10, 9, 8, 6, 6, 5, 5, 4×4, 2, 1
⚠️  Event "Broken Vault" hit node limit - tree may be incomplete
    "Broken Vault": 3833377 refs created (21 hub pattern(s))
🔍 Found 2 invalid refs: node 45364 -> 25765, node 46039 -> 25765
```

**3.8 million refs across 21 hub patterns.** Exploration blows `NODE_BUDGET: 30000`
([`configs.js:129`](./configs.js)) and truncates mid-flight, publishing a 19-node tree that is
both incomplete and internally inconsistent.

### The dangling refs

Node `25765` was allocated during exploration and then **discarded** when the budget hit, so two
refs point at a node that doesn't exist. These are the **only 2 dangling refs out of 583** in the
entire file.

```
▸ Examine the statues
    ▸ Examine the first statue   [45364] --REF--> 25765   ✗ target does not exist
    ▸ Examine the second statue  [46039] --REF--> 25765   ✗ target does not exist
    ▸ Examine the third statue   [46572] --REF--> 46573   ✓ resolves
```

The three statues are the same menu pattern, so all three should behave alike — two are broken
and one works, purely as an artifact of where the budget ran out.

### Render impact (confirmed, not speculative)

Nothing crashes — every lookup is guarded — but the output is visibly wrong, and wrong
*differently* in each mode:

- **INDICATOR mode:** node dimensions branch on `node.ref !== undefined`
  (`src/codex/utils/eventNodeDimensions.ts:286-308`) while label content branches on whether the
  target *resolves* (`EventTree/nodes.ts:323-327`, `labelText = refNodeLabel || ''`). So the node
  reserves full loop-badge height and renders `🔄 Loops back to:` followed by an **empty line**.
  In compact mode it's a box containing a bare `🔄`.
- **LINK mode:** `findLoopBackLinks` (`EventTree/links.ts:349-357`) guards with
  `if (targetNode)`, so **nothing is drawn at all** — the node reads as a plain dead end and the
  broken data leaves no trace.

There is no ref-target validation at load or render time; the parse-time `checkInvalidRefs` pass
(#15) is what caught this, and it only warns.

### Approach

Same shape as Rathael's "ask 9 questions in any order" 9! = 362,880 explosion described in the
README: the statue-examination menu is a **dialogue hub** the inline detector isn't collapsing.
Add `Broken Vault` to `DIALOGUE_MENU_EVENTS` in [`event-overrides.js`](./event-overrides.js) so
menu children collapse into refs back to the hub, then iterate.

Note the parser *did* discover 21 hub patterns here — so also work out why hub optimization ran
yet still produced 3.8M refs. Possibly the hub is being detected at the wrong node, or detection
happens only after the budget is already exhausted. Check the blacklists
(`POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST`, `COUSIN_REF_BLACKLIST`) too.

Iteration loop:

```bash
node scripts/parse/parse-event-trees.js --only "Broken Vault" --debug "Broken Vault" --dry-run
```

**Done when:** no node-limit warnings, `checkInvalidRefs` reports 0 invalid refs across all
events, all three statues render consistently, and the tree contains the full vault content
(the current 19 nodes are certainly a fraction of it).

---

## Not issues (checked, no action)

- **`Grove of the Dying Star Finish`** — showed as added + removed. Just an upstream **rename**
  (double space → single space), not new content.
- **16 `desc`-only changes** (`A Familiar Face`, `The Priestess`, `Priest`, `Succubus`, etc.) —
  typo and whitespace fixes (`\r`→`\n`, `\n`→`<br>`, `mankinds`→`mankind's`). `desc` is **not**
  part of the tree output (`{name, type, artwork, rootNode, blightbaneLink}`), so these have zero
  effect on Eventmaps.
- **4 new events with empty `artwork`** (`Broken Vault`, `Empty Vault`, `Strange Light`,
  `Vault Door`) — pre-existing pattern for type-8 events; 11 others were already like this before
  the sync. Missing upstream, not a parser bug.
- **Non-fatal parse warnings** for `Enchanter`, `The Nexus`, `Nathali`, `Nathali Brightcandle`,
  `Dreampod`, `Vault Door`, `Vaelmorin, the Ancient Death` — these overlap with items 2–4 above
  and should be re-checked once those are fixed, rather than tracked separately.
  **Partly resolved:** the `unrecognized command` half of these is gone — all four commands are
  now registered in `KNOWN_COMMANDS` (see item 2's follow-up), which clears `Nathali`,
  `Nathali Brightcandle`, `Vault Door` and `Vaelmorin` entirely. Still open: `unresolved knot
  variable read` (`Enchanter`, `The Nexus` — item 4) and `bare-colon command` (`Dreampod` —
  item 3).
