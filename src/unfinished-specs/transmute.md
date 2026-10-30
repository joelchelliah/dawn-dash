# Spec: Transmute (new tool)

A seventh tool, **Transmute** (`/transmute`, `src/transmute/`). Pick one card and see every card it
can transmute **into**, or every card that can transmute **into it**, at the **same** rarity or
**one tier higher**. The layout follows Cardex and Skilldex: a filter panel on the left and a
results panel on the right. Card details come live from the shared `useCardData`. Transmute
relationships come from a static JSON built by an external tool and narrowed in by a sync script,
following the treasures/weapons pattern.

## Game rules this tool models

These were confirmed in discussion. The data format below follows from them, so check here first if
the data ever looks wrong.

- **Only rarity + banner decide a card's transmute results.** Every card with banner A and rarity X
  transmutes into the same list of cards. A same-rarity transmute never offers the card itself.
- **Higher means exactly one tier up**: Common → Uncommon → Rare → Legendary, and **Monster →
  Common**. Monster is rarity `4` in `CardData`, so "one tier up" is not `rarity + 1`.
- **Same-rarity transmutes are symmetric**: if A → B, then B → A, as long as B may itself be
  transmuted.
- **Exceptions exist, and they also group into pools.** Some cards are never offered as a result
  (Revelations, Legendary basic attacks, some treasure cards, …). A very small set can't be a target
  at all (e.g. monster-rarity cards with a non-monster banner). Another very small set can't be
  transmuted at all. **All of these are encoded in the data.** The tool contains no transmute rules
  apart from removing the selected card from its own same-rarity result.
- **Banner access.** Each energy unlocks its banners. A hybrid banner needs **both** of its energies:

  | Banner                             | Needs            |
  | ---------------------------------- | ---------------- |
  | Green (1)                          | Dex              |
  | Blue (2)                           | Int              |
  | Red (3)                            | Str              |
  | Gold (8)                           | Holy             |
  | Aqua (6)                           | Dex + Int        |
  | Orange (10)                        | Dex + Str        |
  | Purple (4)                         | Int + Str        |
  | Brown (5), Black (9), Monster (11) | always available |

- **Banner access matters only for _higher_-rarity transmutes.** A same-rarity transmute always
  stays within the same color and rarity, whatever energies you have, so the energy filter has no
  effect in _Same_ mode.
- **Higher, _From_ — a selected card whose banner you can't access** offers random higher-rarity
  cards of the colors you _do_ have instead. The tool **says so instead of showing result cards**,
  since that list could run to hundreds of cards.
- **Higher, _To_ — only source cards whose banner you can access count.** Sources from inaccessible
  banners are dropped, the same as filtered results. If none remain, the tool says _"None of the
  energy colors you have access to will let you transmute into this card"_ and shows no result
  cards.
- **Both messages show the energy icons currently ticked**, so it's visible which colors the message
  is about.

## Data format

The external tool writes `scripts/data/transmutes.json` (gitignored and pasted in manually, like
`treasures.json`/`weapons.json`). `scripts/sync/sync-transmutes.js` validates it and writes
`src/transmute/data/transmutes.json`:

```json
{
  "pools": {
    "green-common": [101, 102, 103],
    "green-uncommon": [201, 202],
    "exception-legendary-weapons": [301, 302]
  },
  "cards": {
    "101": { "same": "green-common", "higher": "green-uncommon" },
    "301": { "same": "exception-legendary-weapons", "higher": null }
  },
  "nonTransmutable": {
    "998": {},
    "999": { "reason": "Revelation cards can't be transmuted" }
  }
}
```

- **`pools`**: each target list stored **once**, keyed by a readable id (helpful when debugging) and
  holding the **game ids** (`blightbane_id` on `CardData` — see the `blightbane_id` invariant in
  `src/shared/CLAUDE.md`). A pool lists every valid target. Removing the selected card itself is the
  tool's job, not the data's.
- **`cards`**: every transmutable card, mapped to its `same` and `higher` pool ids. `higher` is
  `null` for Legendary, and `same` may be `null` if a card has no same-rarity targets.
- **`nonTransmutable`**: ids that can't be transmuted. This list is not redundant with "absent from
  `cards`". It is what lets the UI tell **"this card can't be transmuted"** apart from **"this card
  is newer than the data"** (a game patch landed before the next sync). **`reason` is optional**:
  whether the external tool can produce one isn't known yet. The UI shows it when present and falls
  back to a generic line when not. It is an object per id, not a bare id list, so adding `reason`
  later isn't a format change.
- **Why not per-card `lower`/`same`/`higher` lists?** About 2,700 cards × hundreds of ids × 3 lists
  comes to roughly 1M ids, or 5–10 MB of JSON statically imported into the bundle. Pools shrink that
  to a few tens of KB. `lower` is just the reverse of `higher`, so storing it would duplicate data
  that can drift. It is derived at load instead (below).
- **Lookups**, built once at module scope (like `EVENTS_BY_NAME` in Booty):
  - _From_, same: `pools[cards[sel].same]` minus `sel`.
  - _From_, higher: `pools[cards[sel].higher]`.
  - _To_, same: every card `c` whose `same` pool contains `sel`, minus `sel`. Symmetry makes this
    almost equal to _from_, same. Compute it through the reverse index anyway, so the exceptions
    stay data-driven.
  - _To_, higher: every card `c` whose `higher` pool contains `sel`.
  - The reverse index maps each card id to the pools containing it, then each pool id to the cards
    referencing it, kept separately for `same` and `higher`. Build it as `Set`s/`Map`s once, never
    per render.
- Ids in the data that aren't in the live card cache are skipped, with a dev-only `logger.warn`.
  That is the same drift story as Booty's `findUnmappedPools`.

## Decisions already made

- **Name `Transmute`, path `/transmute`, folder `src/transmute/`.** It launches publicly at the end
  of this spec, with no beta period. While it is being built it stays `unlisted: true` (the
  `add-new-tool` default), so a half-built tool never shows on the landing page. Task 10 removes the
  flag and cleans up after development.
- **Filters**, all in the left panel:
  - Card search with suggestions.
  - Direction toggle: _From_ / _To_. Default _From_.
  - Rarity toggle: _Same_ / _Higher_. Default _Same_.
  - Card sets: Cardex's `useCardSetFilters`, including `Core°`.
  - Energies: Dex / Int / Str / Holy, with Skilldex's energy icons (`DexImageUrl`, …), all ticked by
    default.
  - Formatting: **Show card art** and **Show Blightbane link** only, for now.
- **Card sets narrow the _results_, and energies gate _higher_-rarity transmutes** (see Game rules).
  Neither limits which card you can pick.
- **Results reuse Cardex's `ResultCard`, banner grouping, sort order and styling.** Clicking a
  result does nothing. Navigation goes through the Blightbane link only.
- **Search** is a case-insensitive name match ranked prefix-first, showing the top 5 suggestions,
  each with tiny artwork and the name. Cards sharing a name (`hasDuplicateName`) appear as separate
  suggestions keyed by `blightbane_id`, with something to tell them apart (see Task 5).
- **URL**: the selected card and **every filter option** live in the query string, Cardex-style,
  so a shared link reproduces the whole view. Formatting options stay out of the URL, as they do in
  Cardex, because they are a viewer preference, not part of the view.
  - `?card=<slug>` holds the selected card: the name lowercased with `_` for spaces, plus a
    `_<blightbane_id>` suffix only for `hasDuplicateName` cards.
  - `?dir=to` and `?step=higher` are written only when they differ from the defaults.
  - `?sets=` uses the existing `cardSetUrlCodec`, and `?energies=` uses **named** codes
    (`dex,int,str,holy`), the same as Skilldex requirements.

  The selected card is a query param rather than a `/transmute/[card]` route. That keeps one page
  component, so the Booty remount problem can't arise. Per-card OG previews aren't worth building,
  because card names are only known at runtime.

- **Filters persist to localStorage** under a new `codex_transmute_filters_v1`. The `codex_` prefix
  keeps the naming consistent, per the localStorage-key invariant in `src/shared/CLAUDE.md`.
- **Data arrives through the sync pattern**: `npm run sync-transmutes`, also run by `sync-all`. If
  the external file already matches the output shape, the script just validates it and passes it
  through.

## How to work through this spec

**Read first:**

- The root `CLAUDE.md`, in particular:
  - Tools never import from each other.
  - The Tool Registry section.
  - The `sync-treasures`/`sync-weapons` ownership story.
  - The rule that `npm run verify` (+ `npm run build` for `pages/`/data hooks) is required.
- `src/shared/CLAUDE.md`:
  - `blightbane_id` is the game's id.
  - Cards can share a name.
  - Artwork goes through `useCardImageSrc` with the category.
  - The nil-expansion `Core°` rule.
  - Every mutator must be in `TRACKED_FILTER_HANDLERS`.
  - Filter URL codes are permanent.
  - The `codex_` key prefix.
- `src/cardex/CLAUDE.md`:
  - `.result-card` keeps `content-visibility: auto` + `contain-intrinsic-size`. This is what makes
    hundreds of rows cheap, so it must survive the move to `shared/`.
  - The `.result-card__name` min-width rule.
  - Monster cards are rarity 4 / banner 11.
- `src/booty/CLAUDE.md`: the single-`useCardData()` invariant (the same applies here) and the
  whitelist sync story.
- The `add-new-tool` skill (`.claude/skills/add-new-tool/SKILL.md`), for Tasks 3, 10 and 11.

**Where to stop: pause after every task for the user to check it.** Task 1 restructures Cardex's
most performance-sensitive component. A regression there would be invisible under later Transmute
work, which renders the same rows. Tasks 4–7 each change one panel's behavior, and each is easier to
judge alone. When a task is finished, mark it `COMPLETED` here, say what changed and which pages and
states to look at, and wait. The user runs the dev server.

- **Task 1 has no visible effect by design**: Cardex must look and behave exactly as before.
- **Task 2 has no visible effect** beyond the sync script's output.
- **Tasks 9 and 11 are the user's**: an agent prepares what it can and waits.

**Verification:**

- `npm run verify` after every task.
- `npm run build` after Tasks 1, 3 and 8, which touch shared components, `pages/` and URL handling.
- `npm run build && npm run check-sw` in Task 10, after Task 9 adds the `public/` images.
- Visual checks are named per task. Always compare desktop _and_ mobile widths, and a large result
  set (a Common, about hundreds of cards) as well as a tiny one.

**Docs that change with the work:**

- **Root `CLAUDE.md`**:
  - "six tools" → seven, and the Main Features list.
  - The `/src` folder list.
  - Data Synchronization (`sync-transmutes`, and `sync-all`'s sequence).
  - "Each hook's source differs" is unaffected.
- **`src/shared/CLAUDE.md`**: Key files gains the moved result-card components.
- **`src/cardex/CLAUDE.md`**: the `.result-card` invariants move to `src/shared/CLAUDE.md` along with
  the component. Leave a one-line pointer in Cardex's file.
- **New `src/transmute/CLAUDE.md`**, written in Task 8, covering:
  - The data format and why it uses pools.
  - The rule that the tool encodes no transmute rules beyond removing the selected card from its own
    same-rarity result.
  - `nonTransmutable` vs. unknown ids.
  - The banner-access table, and the rule that access only gates higher-rarity transmutes.
  - The URL scheme.
- **`src/unfinished-specs/card-metadata.md`**: it says to "stop before `transmute`" because that is a
  card-to-card join. That stays true for the metadata file, since this tool takes transmute data
  through its own file. Add no transmute field there.

If any task turns out to need contradicting a documented invariant, raise it with the user rather
than rewriting the invariant.

**Comment style**: the non-obvious _why_, in a line or two. No restating the code or narrating the
history of a change.

## Tasks

### Task 1 — Move Cardex's result rows into `shared/`

Transmute can't import from `src/cardex/`. Move these to `src/shared/components/`:

- `ResultCard` and its pieces (`CardArtwork`, `CardIcons`, `CardMetadata`).
- The banner-grouped list rendering from `CardResultsPanel`: the `cardsByBanner` grouping, the
  `results-cards__banner--<n>` styling and the cross-group entry stagger.
- The helpers they need (`getBlightbaneCardUrl` and whatever else `cardHelper.ts` lends them).

`CardStrikeBadge`/`struckTrigger` and the keyword pills are Cardex-only. Make them optional props or
slots rather than moving Cardex's tracking concepts into `shared/`. Exactly how to split
`ResultCard`'s 17 props is left to the implementation, with one constraint: **Cardex's output stays
pixel-identical**.

Check: Cardex at desktop and mobile with keywords, struck cards, hide-tracked, every formatting
toggle, and a large result set (scroll the whole list to confirm rows still render lazily with no
scrollbar jumps).

### Task 2 — Data: sync script, types, lookups

- Write `scripts/sync/sync-transmutes.js`. Reuse `whitelist-fields.js` where it fits; the top-level
  shape is an object, not an `entries` array. Fail fast if the input is missing. Validate that:
  - every referenced pool exists;
  - every id is a number;
  - no id is in both `cards` and `nonTransmutable`;
  - a `nonTransmutable` entry has no fields besides an optional string `reason`.

  Print the output size.

- Add `npm run sync-transmutes`, and add the script to `sync-all.js`.
- Add types in `src/transmute/types/`.
- Add the lookup module in `src/transmute/utils/`, holding the four lookups and the reverse index
  described in Data format.

Until the external tool exists, use a small hand-written `scripts/data/transmutes.json` covering at
least one exception pool and one `nonTransmutable` card.

Check: the script's output and a temporary test of the four lookups, deleted afterwards.

### Task 3 — Scaffold the tool

Follow the `add-new-tool` skill, steps 1–3 and 5:

- A registry entry with `unlisted: true`. The images temporarily point at Cardex's until Task 10.
- `pages/transmute.tsx`.
- `src/transmute/index.tsx`, which owns the single `useCardData()` call.
- `transmute` added to `TOOL_DIRS` in `.eslintrc.js`.
- New `PanelHeader` types.
- An empty two-panel layout reusing Cardex's page scaffolding.
- Draft copy for `description`/`shortDescription`/`ogDescription`, which the user will rewrite in
  Task 9.

Check: `/transmute` renders both empty panels with the card-loading bar. The tool is absent from the
landing page and side menu, and has `noindex` in `<head>`.

### Task 4 — Filter state and the non-search filters

- Filter hooks:
  - the direction and step toggles;
  - card sets (shared `useCardSetFilters`);
  - a new energy-filter hook with named URL codes;
  - formatting (card art, Blightbane link).
- A filter store at `codex_transmute_filters_v1`, with every mutator added to
  `TRACKED_FILTER_HANDLERS`.
- Render them in the left panel. Energy labels reuse Skilldex's icon-label pattern, so lift
  `renderRequirementFilterLabelIcon` into `shared/` if Transmute would otherwise copy it.
- **The toggle control is left to trial and error in the browser.** No two-option toggle exists yet,
  so check `ButtonRow` first.

Check: every control toggles, survives a reload, and resets.

### Task 5 — Card search with suggestions

- A search field showing the top 5 matches, prefix matches first.
- Each suggestion shows tiny artwork (`useCardImageSrc` with the card's category) and the name.
- Keyboard support: ↑/↓/Enter/Escape, following the ARIA combobox pattern.
- Selecting a card sets the selected card.
- Twins: label each with something that tells them apart. Try rarity/banner first and settle in the
  browser.
- Check whether `SearchField` can be extended rather than duplicated.

Check: typing, mouse and keyboard selection, twins (e.g. the Whirlpools), mobile width.

### Task 6 — Results panel

- **The selected card at the top**, rendered with the shared `ResultCard`.
- **A header that makes the mode unmistakable**: the direction (_transmutes into_ / _transmuted
  from_) and the step (_same rarity_ / _one rarity higher_). It should be visible without reading
  the filter panel.
- **A one-line subtext by the selected card**, in small text above or below it, explaining what the
  results are. One line per direction × step:
  - _From_, same: "Transmuting into a card of the same rarity and banner color"
  - _From_, higher: "Transmuting into a card one rarity higher, of the same banner color"
  - _To_, same: "Cards of the same rarity and banner color that transmute into this one"
  - _To_, higher: "Cards one rarity lower, of the same banner color, that transmute into this one"

  These are placeholders: the final wording is the user's, and the placement is left to trial and
  error in the browser. Keep the four lines in one lookup so they're easy to tweak. If the real data
  has exception pools that cross banners, "same banner color" would be false for those cards, so
  check the line against them before keeping that phrase.

- Results grouped and sorted exactly like Cardex, with the selected card removed from same-rarity
  results.
- A result count, plus how many results the filters hid, so an empty list explains itself.
- States:
  - no card selected;
  - card can't be transmuted (`nonTransmutable`), showing its `reason` when present;
  - card unknown to the data;
  - Legendary + _From_ + _Higher_ (nothing higher);
  - Common + _To_ + _Higher_ (only Monster cards transmute up into Commons, if any);
  - _Higher_ + _From_ with no access to the selected card's banner: the "random cards of your
    colors" message with the ticked energy icons, and no result cards;
  - _Higher_ + _To_ with no accessible source left: the "None of the energy colors you have access
    to…" message with the ticked energy icons, and no result cards;
  - every result hidden by the card-set filter.

Check: each state above. In _Same_ mode, check that toggling energies changes nothing. A large
Common pool and a small Legendary one. Card art on and off. Desktop and mobile.

### Task 7 — URL state

The `?card`, `?dir`, `?step`, `?sets`, `?energies` params, read on load and written on change.
`useFilterUrlParams` is built around `keywords`/`?weekly`, so generalize it rather than forking it:
keep Cardex and Skilldex behavior identical. A URL whose card slug doesn't resolve falls back to no
selection.

Check: share a URL with every param into a fresh tab. Check back/forward. Check that Cardex's and
Skilldex's URLs still round-trip.

### Task 8 — Docs

Write `src/transmute/CLAUDE.md` and apply the doc changes listed under "How to work through this
spec". `npm run verify` and `npm run build`.

### Task 9 — Launch assets and copy (the user's)

The agent can draft copy on request, but the final wording is the user's.

- Create the OG image (2400×1260) and logo in `image-sources/` as `og-image-transmute.png` /
  `logo-transmute.png`, then run `npm run compress-images` **and then**
  `npm run generate-landing-images`, in that order, so `public/landing-transmute.webp` is derived
  from the new OG image.
- Pick the nav icon, a Blightbane image URL from `src/shared/utils/imageUrls.ts`.
- Rewrite the drafted registry copy: `description`, `shortDescription`, `ogTitle` (emoji included),
  `ogDescription`.

### Task 10 — Launch and cleanup

Follow `add-new-tool` step 7:

- Point the registry's `ogImage`/`logoImage`/`landingImage`/`navIcon` at the Task 9 assets, and
  confirm each file exists in `public/`. A missing `logoImage` has no effect until `unlisted` is
  gone.
- Remove `unlisted: true`.
- Add `/transmute` to `scripts/generate-sitemap.js` and regenerate it with
  `node scripts/generate-sitemap.js`.
- **Confirm `src/transmute/data/transmutes.json` came from the external tool, not the Task 2
  fixture**: re-run `npm run sync-transmutes` against the real input and check the pool and card
  counts it prints.
- Delete any leftover temporary tests and dev-only scaffolding from development. Keep the
  `logger.warn` drift warnings, which are permanent.
- Run `add-new-tool` step 5's "once unlisted is removed" checks:
  - the landing card shows with its image and short description;
  - the side menu shows the link and its active state;
  - `<head>` has the canonical link and JSON-LD, with no `robots` meta.
- Run `npm run verify && npm run build && npm run check-sw`.

Check: the landing page, the side menu, and a shared `/transmute?card=…` link previewed in
Discord/Slack, which should show the Transmute OG image.

### Task 11 — Google Search Console (the user's, after deploy)

Follow `add-new-tool` step 8. It can only be done against the live site, in the `dawn-dash.com`
property, **using the `www` host** throughout.

1. Fetch `https://www.dawn-dash.com/transmute` and confirm the served HTML has
   `<link rel="canonical">` and **no** `noindex`. Submitting a `noindex` page gets it recorded as
   excluded, which is slower to undo than to avoid.
2. Sitemaps → resubmit `sitemap.xml`. Don't regenerate it here; Task 10 already committed the URL.
3. URL Inspection → `https://www.dawn-dash.com/transmute` → **Request Indexing**. If it reports
   `noindex`, go back to step 1.
4. Only the bare `/transmute` should be indexed. `?card=…` variants all render the same page shell,
   and the canonical link already points at the bare path, so don't submit them.
5. Re-check in a few days. "Discovered – currently not indexed" is normal at first.

Once every task is `COMPLETED`, delete this spec.
