# Spec: card metadata file (cost + artwork + flavour text)

Replace `src/shared/data/card-artwork.json` with a single **id-keyed** metadata file covering both
cards and talents, carrying `cost`, `artwork` and `flavortext` alongside `id`, `name` and
`category`. The immediate goal is showing a card's **cost** in Cardex; artwork comes along because
it lives in the same endpoint, and the id key fixes collisions the current name key cannot.

## Why a static file rather than Supabase

Cost/artwork/flavour text change only when Blightbane ships a new game version, so a database buys
a freshness mechanism for data that is not fresh — and it would put Cardex back on Supabase, which
[the root `CLAUDE.md`](../../CLAUDE.md) now explicitly says it is not on. Sizes were measured over a
220-entry sample and extrapolated to all 3102 entries:

| Contents                     | Size       |
| ---------------------------- | ---------- |
| cost only                    | 44 KB      |
| cost + artwork               | 117 KB     |
| **cost + artwork + flavour** | **153 KB** |
| + flags                      | ~190 KB    |
| + effects                    | ~1,026 KB  |
| + transmute                  | ~1,482 KB  |
| entire raw response          | ~4,852 KB  |

153 KB is *smaller than the 278 KB `card-artwork.json` being replaced*, and well under the 526 KB
`cards-codex` payload Cardex already downloads at runtime. **`effects` is the cliff** — nested
arrays-of-objects 5× the file in one step, and `transmute` is a card-to-card id graph, i.e. a join.
If either is ever wanted, that is the point to reconsider a database; do not add them here.

## Decisions already made

These were settled in discussion — do not re-litigate them mid-implementation:

- **One file, keyed by `id`**, replacing `card-artwork.json` outright rather than sitting beside it.
  Two artwork sources would drift.
- **`cost` is minified to a string**: `"DEX3"`, `"HOLY2,NEUTRAL1"`. Empty string means free.
- **Cards and talents go in the same map.** Verified: zero id collisions between the two payloads.
- **Flavour text is included.** Only ~10% of cards have one (avg 73 chars, max 160), but ~55% of
  *talents* do, so Skilldex benefits more than Cardex.
- **Scoring keeps a name-keyed lookup.** It has no id available (see Task 4).
- **Stop before `flags`/`effects`/`transmute`.** Not needed for this work.

## Verified facts (checked 2026-08-06 — re-check before acting)

These were measured against the live API, not assumed. They are the reason several tasks are
shaped the way they are.

- **`cards-codex` has no `cost` field.** Its cards carry only
  `id, name, rarity, type, category, description, color, expansion`. Cost exists solely on the
  per-card endpoint, and there is **no bulk endpoint for it** — hence the crawl.
- **Two payloads cover everything.** Blank `category=` returns **2716 cards**; `category=10`
  returns **386 talents**. All 371 artwork names absent from the cards payload are covered by the
  talents one, leaving **zero uncovered**.
- **`id` is unique across both payloads** (2716 + 386, no overlap). This is what makes a single
  flat id-keyed map possible.
- **`/api/card/<id>` works** and resolves the exact card. `/api/card/<name>` does **not**: for the
  19 duplicate names it returns one arbitrary match. Verified on `Awakening` — id 660263 is
  `HOLY2` / `cardart_5_4`, id 990010 is free / `Prayer`.
- **The crawl costs ~5 minutes**: ~116 ms/card at concurrency 8, measured over 40 cards.
- **All 385 Supabase `Talents.blightbane_id` values match Blightbane's `category=10` ids** —
  checked against production. This is what lets Skilldex key by id (Task 5).
- **Talent costs are always empty.** All 40 sampled talents had a `cost` object present with every
  field 0. Talents get `""`, same as a free card.
- **~34% of cards are genuinely free.** "Free" and "missing from the mapping" must stay
  distinguishable, or an absent entry silently renders as a zero cost.
- **One artwork value will change**, and it is a **fix, not a regression**: id 660263 `Awakening`
  currently resolves to `Prayer` via first-entry-wins; the endpoint says `cardart_5_4`.

## How to work through this spec

### What to read first

- **Root [`CLAUDE.md`](../../CLAUDE.md)** — *Data Layer* (each hook's source; Cardex is on
  Blightbane, not Supabase), *Data Synchronization* (local Node scripts own artwork; the
  `scripts/` vs edge-function split), and *PWA & Performance* (the `card-artwork` service-worker
  bucket keyed on `/images/icons/**`).
- **[`src/codex/CLAUDE.md`](./CLAUDE.md)** — the artwork invariants this work directly rewrites:
  - Artwork resolves through **module-scope `Map`s built once at import**, never a per-render
    linear `.find`. The new file must keep that shape.
  - Lookups use the JSON's key **verbatim** — artwork names carry curly apostrophes, typos and set
    suffixes (`"Typhon's Cunning"` → `"Thyphon's cunning_eclypse-miniset"`). Never normalise either
    side of a lookup.
  - `artwork: null` entries are filtered out before the maps are built so they cannot shadow a
    populated sibling.
  - **A missing name or `artwork: null` is the only reliable miss signal** — blightbane.io serves a
    valid placeholder webp with HTTP 200 for non-existent icons, so `onError` never fires for a
    wrong artwork value. This is why Task 2 validates the crawl by *count*, not by fetching images.
  - The **name+category collision** invariant is the one this spec partially retires — read it, then
    see Task 6 for what replaces it.
- **[`supabase/functions/README.md`](../../supabase/functions/README.md)** — confirms talents are
  the only Supabase data the app reads, and that `sync-talents` is insert-only. Nothing in this
  spec touches Supabase; it is listed so the boundary stays visible.

### Where to stop

**Tasks 1–3 may be chained** — they build and validate the data file with no user-visible effect.
**Tasks 4–7 each pause for confirmation.** They rewrite the artwork lookup that three call sites
across two tools depend on, and a mistake in Task 4 would be invisible until it surfaces as wrong
art several tasks later. Cardex and Skilldex render artwork very differently (React `Image` vs D3
`<image>` with a clip path and gradient mask), so each needs its own look.

Finish the task, get it into a state the user can look at, say what changed and what to look at,
then wait — **the user runs the dev server, not the agent**.

**Task 3 has no visible effect of its own** (it only adds a validation script) — that is expected,
not a broken step.

**Mark each finished task `COMPLETED` in this file before asking the user to verify it**, so a
fresh context can tell what is already done from the spec alone.

### How it gets verified

- **Tasks 1–3**: `node scripts/sync-card-metadata.js` runs clean, plus the Task 3 validator. Check
  the written file's entry count (**3102**) and size (**~153 KB minified**) against the table above.
- **Tasks 4–7**: `npm run verify` for every task. **Also `npm run build`** for Task 4 — it changes a
  module imported at page level.
- **Visual, in the user's dev server:**
  - **Cardex** (`/cardex`) — artwork on result cards at desktop **and** mobile widths (the artwork
    box is 48px vs 40px), a card whose artwork is missing (must still render the rarity-tinted
    placeholder square, not a broken image), and specifically **`Awakening`**, whose art changes.
  - **Skilldex** (`/skilldex`) — talent art on/off via the checkbox, **expanded and collapsed**
    nodes, and at least two zoom levels. Node height depends on artwork
    (`NODE.ARTWORK.EXTRA_ROW_HEIGHT`), so a lookup regression can shift layout, not just imagery.
  - **Scoring** (`/scoring`) — the Bolgar's Blueprints panel image still resolves.

### Which docs change with the work

Grep before editing — these were found by grepping, not recalled:

- **[`src/codex/CLAUDE.md`](./CLAUDE.md)** — three artwork bullets. The "module-scope `Map`s"
  bullet needs its file name and key updated; the "same name carries different artwork per
  `category`" bullet and the "dozen card names still collide" bullet both describe a problem that
  Cardex and Skilldex no longer have (Scoring still does). Rewrite in Task 6, not before.
- **Root [`CLAUDE.md`](../../CLAUDE.md)** — the `useCardImageSrc` entry under *Shared
  Infrastructure* names `card-artwork.json` and describes the `category` parameter and
  `TALENT_ARTWORK_CATEGORY`; *Data Synchronization* names `fetch-card-artwork-mapping.js` as what
  writes the artwork file.
- **`package.json`** — the `sync-artwork` script currently points at
  `scripts/fetch-card-artwork-mapping.js`.

There is **no `scripts/README.md`** (checked) — `scripts/parse/README.md` covers only the event
pipeline and is unaffected.

**New invariants worth recording once implemented** (Task 6): that the metadata file is id-keyed and
why; that the crawl must iterate ids and never names; and that "free" and "missing" are distinct.

**If a task turns out to contradict a documented invariant, raise it with the user rather than
quietly rewriting the doc.**

### Comment style

The non-obvious *why*, in a line or two. No restating the code, no narrating the change's history.

---

## Tasks

### Task 1 — Write the crawl script

Add `scripts/sync-card-metadata.js`, modelled on the existing
[`fetch-card-artwork-mapping.js`](../../scripts/fetch-card-artwork-mapping.js) (same plain-Node,
no-dependency style — it uses `https.get`; `fetch` is fine on Node 24).

1. Fetch **both** codex payloads: `cards-codex?search=&rarity=&category=&type=&banner=&exp=` and
   the same with `category=10`.
2. For every entry in both, fetch `/api/card/<id>`. **By id, never by name** — the whole point of
   the key. Concurrency 8 (~5 min for 3102 entries); log progress so it does not look hung.
3. Write `src/shared/data/card-metadata.json`, id-keyed:

   ```json
   {
     "614322": { "name": "Fireball", "category": 0, "cost": "INT2", "artwork": "cardart_4_15" },
     "541991": { "name": "Abolish", "category": 0, "cost": "NEUTRAL1", "artwork": "creature_abilties_2_40", "flavortext": "..." }
   }
   ```

   - `cost`: uppercase `KEY` + amount for each non-zero field of the cost object, comma-joined in
     the API's own field order (`dex, int, str, holy, neutral, dexint, dexstr, intstr, blood`).
     **Empty string for free** — always present, never omitted, so free stays distinguishable from
     missing.
   - `artwork`: verbatim from the endpoint. `null` stays `null` (Task 4 filters it, mirroring
     today's behaviour).
   - `flavortext`: **omit the key entirely when empty** — ~90% of cards have none, and omitting is
     what keeps the file at 153 KB.
   - Minified (no pretty-print). At 3102 entries a formatted file is needless diff noise.
4. **Fail loudly**: throw if either payload is empty, or if more than a handful of per-card fetches
   fail. A partial file that looks valid is the dangerous outcome — silent truncation here would
   surface much later as missing art.

Add `"sync-card-metadata": "node scripts/sync-card-metadata.js"` to `package.json`. Leave the old
`sync-artwork` script in place until Task 7.

### Task 2 — Run it and sanity-check the output

Run the crawl. Confirm against the verified facts above:

- **3102 entries** (2716 + 386), **~153 KB**.
- Every id from both payloads is present.
- `Awakening` **660263** → `cardart_5_4` / `HOLY2`, and **990010** → `Prayer` / `""`. This pair is
  the whole justification for the id key; if it is wrong, stop.
- All 386 talents have `cost: ""`.
- Spot-check a name with a curly apostrophe (`Typhon's Cunning`) survived verbatim.

### Task 3 — Add a validation script

Add `scripts/validate-card-metadata.js` (or fold it into Task 1 behind `--validate`) that re-reads
the written file and asserts the Task 2 checks: entry count matches the two payloads, no missing
ids, `cost` present on every entry, no duplicate ids.

**Why separate**: the crawl takes 5 minutes, so a mistake found by eye afterwards is expensive to
re-test. This makes re-verification after a future game version a single command.

This has **no user-visible effect** — expected.

### Task 4 — Rewrite `useCardImageSrc` over the new file

Rework [`src/shared/hooks/useCardImageSrc.ts`](../shared/hooks/useCardImageSrc.ts) to read
`card-metadata.json`, keeping the existing exports working. Build **two** module-scope maps at
import, as today:

- **`byId`** — the new primary lookup.
- **`byName`** — for Scoring, which has no id. Keep first-entry-wins and the `artwork: null` filter,
  so its behaviour is unchanged.

Add an id-based accessor (e.g. `getCardImageSrcById(id, fallback?)`) and a cost accessor
(`getCardCost(id)`). **Keep `getCardImageSrc(name, fallback?, category?)` as-is for now** — Scoring
still needs it and Task 5 has not moved Skilldex yet. Do not delete the category parameter in this
task.

Keep the file's existing comments about verbatim keys and the HTTP-200-placeholder caveat; they are
still true and still load-bearing.

**Verify**: `npm run verify` **and `npm run build`**.

### Task 5 — Move Cardex and Skilldex onto the id lookup

Two call sites, both of which have an id available:

- **Cardex** —
  [`CardArtwork.tsx:34`](./components/ResultsPanels/CardResultsPanel/ResultCard/CardArtwork.tsx#L34)
  currently calls `useCardImageSrc(card.name, null, card.category)`. `CardData` carries `id`, so
  switch to the id accessor. Keep `null` as the fallback — that is what opts into the rarity-tinted
  placeholder square.
- **Skilldex** —
  [`talentNodes.ts:272`](./components/ResultsPanels/TalentResultsPanel/TalentTree/talentNodes.ts#L272)
  calls `getCardImageSrc(data.name, null, TALENT_ARTWORK_CATEGORY)`. **This one needs plumbing**:
  `TalentTreeTalentNode` has **no id field** — only `name`. `TalentData.blightbane_id` exists and
  all 385 match Blightbane, so thread it through
  [`talentsResponseMapper.ts`](./utils/talentsResponseMapper.ts) onto the tree node first. The
  mapper already keys its internal maps on `blightbane_id`, so the value is in hand.

  ⚠️ **The node-dimension cache key** in
  [`talentNodeDimensions.ts:185`](./utils/talentNodeDimensions.ts#L185) is built from node fields.
  Adding a field to the node type does not require a key change (art presence is already in the
  key via `art-${...}`), but check the key still discriminates correctly.

Once both are moved, `TALENT_ARTWORK_CATEGORY` has no consumer — but **leave the export until Task
6** confirms nothing else imports it.

**Verify**: `npm run verify`, then the Cardex **and** Skilldex visual checks above. Skilldex needs
expanded/collapsed and two zoom levels because artwork affects node height.

### Task 6 — Update the docs

Only now that behaviour is settled:

- **[`src/codex/CLAUDE.md`](./CLAUDE.md)** — update the module-scope-`Map`s bullet to the new file
  and id key. Rewrite the two collision bullets: the name+category disambiguation and the
  "dozen colliding names" caveat **no longer apply to Cardex or Skilldex** (both key by id), but
  **still apply to Scoring's name lookup** — say exactly that rather than deleting them. Record the
  new invariants: id-keyed, crawl by id never by name, and free (`""`) ≠ missing.
- **Root [`CLAUDE.md`](../../CLAUDE.md)** — the `useCardImageSrc` entry under *Shared
  Infrastructure* and the artwork line under *Data Synchronization*.
- Grep for any remaining `card-artwork.json` / `TALENT_ARTWORK_CATEGORY` reference and fix or
  remove it.

### Task 7 — Retire the old artwork file

Once Tasks 4–6 are confirmed working: delete `src/shared/data/card-artwork.json` and
`scripts/fetch-card-artwork-mapping.js`, and replace the `sync-artwork` npm script with
`sync-card-metadata`.

**Verify**: `npm run verify` and `npm run build`, then re-check all three tools — this is the task
where a missed reference surfaces as a build failure or missing art.

### Task 8 — Show cost in Cardex

The actual feature. `getCardCost(id)` now returns `"INT2"` etc. for any card.

**Deliberately left to trial and error in the browser**: where the cost sits in the result card and
how it is rendered. The obvious options are text beside the name or energy-orb icons — the codebase
already has orb assets via [`energyImages.ts`](../shared/utils/energyImages.ts), but the cost keys
here (`dexint`, `dexstr`, `intstr`, `blood`) are **not** a 1:1 match for `CharacterClass`, so a
mapping is needed and hybrid costs may have no single orb. Start with text, look at it, iterate.

Note [`src/codex/CLAUDE.md`](./CLAUDE.md)'s warning that `.result-card__name`'s widths are
**minimums, not fixed sizes** — its `flex-shrink: 1` + `min-width: 0` are what keep the
`CardMetadata` pill pinned to the right edge on narrow widths. Adding an element to that row risks
exactly the overflow that invariant describes, so check mobile early.

**Verify**: `npm run verify`, then Cardex at desktop and mobile widths, including a free card
(`""` — decide whether that renders as "0", an orb, or nothing) and a multi-part cost like
`"HOLY2,NEUTRAL1"`.
