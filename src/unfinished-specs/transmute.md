# Spec: Transmute (new tool)

A seventh tool, **Transmute** (`/transmute`, `src/transmute/`). Pick one card and see every card it
can turn **into**, or every card that can turn **into it**, through one of three modes:

- **Transmute**: one rarity higher.
- **Sidemute**: the community's name for a same-rarity transmute.
- **Tradepost**: the Tradepost card, which swaps a deck card for one of the same color and rarity.

The layout follows Cardex and Skilldex: a filter panel on the left and a results panel on the
right. Card details come live from the shared `useCardData`. The transmute data comes from a static
JSON built by an external tool, which a sync script narrows in, following the treasures/weapons
pattern.

## Game rules this tool models

All of these were confirmed by the user and by the external tool's author. The data only says
**which cards may be results** and **each card's color and rarity**. The rules below are
implemented by the tool itself. Upstream once encoded them in the JSON, and that made it too hard
to read. The external tool's worked examples are in `scripts/data/transmute-usage-examples.md`.
They are gitignored like the rest of `scripts/data/`, so this section restates everything the tool
needs.

- **Color and rarity come from the data's `cards` map, never from Blightbane.** Blightbane gets 96
  cards wrong. All 994 Monster-rarity cards are on the Monster banner there, but 70 have another
  banner (Aura of Fear is Black). Infernal Racket is Black, not Monster. Some Songs, Totems and
  Hexes have the wrong banner or none. **Results are grouped and bannered by the data's color**, so
  Aura of Fear shows under Black.
- **The rarity ladder**: Monster → Common → Uncommon → Rare → Legendary, and **Legendary →
  Legendary**. Monster is rarity `4` in `CardData`, so "one up" is not `rarity + 1`.
- **Transmute**: candidates are the cards in `pool` with the source's color, one rarity up, minus the
  source itself. They are filtered by card set and **by energy access to each _result_** (below).
- **Sidemute**: candidates are the cards in `pool` with the source's color and rarity, minus the
  source. Two exceptions:
  - **A Black source sidemutes into Brown cards**, so no Black card is ever a sidemute result.
  - **A Monster-banner source** (the banner, not the rarity) gets **all of `monsterSidemute`**,
    whatever its rarity, and **ignores card sets**. That's 444 cards, mixed rarities.

  No energy check.

- **Tradepost**: candidates are `pool` + `tradepost.adds` − `tradepost.removes`, with the source's
  color and rarity. **The source stays in the list**, because Tradepost offers back the card it
  replaces. Black stays Black, and there is no Monster branch. **No Monster-rarity card is a
  candidate**, so Tradepost on a Monster-rarity card finds nothing and the card stays in the deck.
  Card sets apply; energies don't. `adds` are Tradepost-only results, and the potions are in
  `removes`.
- **Blocked sources**: a card can't go through mode R if it is in a `cannotBeSource` group whose
  `blocks` includes R. Show that group's `reason`. Read groups by `blocks`, never by group `id`,
  because upstream may add groups. The `id` is kept only for mapping a group to UI copy. Today:
  Cursed cards block transmute and sidemute. Monster-rarity cards without a Monster banner block
  sidemute (nothing shares their banner and rarity).
- **Energy access gates the Transmute mode only**, and it is checked on the **result**, not the
  source. Each energy is enough on its own:

  | Banner                                        | Needs (any one of) |
  | --------------------------------------------- | ------------------ |
  | Green (1)                                     | Dex                |
  | Blue (2)                                      | Int                |
  | Red (3)                                       | Str                |
  | Holy (8)                                      | Holy               |
  | Aqua (6)                                      | Dex, Int           |
  | Orange (10)                                   | Dex, Str           |
  | Purple (4)                                    | Int, Str           |
  | Brown (5), Black (9), Monster (11), White (7) | nothing            |

  A `castRequirements` entry **replaces** the banner default and does not add to it. Ceremony of
  Roses (Purple) can be reached with any of Dex/Int/Str. Martyr's Assault (Red) needs Holy, and Str
  doesn't help. An empty list means anyone can reach the card. ("Cast" in the upstream docs means
  "can be transmuted into" here.)

- **The transmute fallback.** When too few same-color candidates survive the filters, the game fills
  the offer with same-rarity cards of **every** color you have access to (potions included, except
  at Legendary). Always the case for a Monster-banner source (`Monster|Common` is empty) and for
  Black Commons and Uncommons. **Worded without the offer size N** (see Decisions).
- **The sidemute potion top-up.** When a source's own list is shorter than the event's offer, every
  potion of the source's rarity joins it, whatever the source's color. There are Common, Uncommon
  and Rare potions only. The data lists potions as ordinary Brown results (`potions` holds their
  ids). Whether and how to say this is optional (Task 6).
- **Distant Memory (`990007`)**, the only White card, comes back empty on every mode. The game does
  something else: transmute offers Rares of any color you have access to, sidemute offers only the 6
  Uncommon potions, and Tradepost offers nothing. Show that as fixed text.
- **Unlocks.** The 41 Metaprogress cards (class starting cards) and the Hunter companions Rend,
  Claw and Maul (Tradepost only) appear in the game only once unlocked. The data lists them as if
  unlocked. A note on them is optional (Task 6).
- **Out of scope**: offer sizes, and deck-dependent rules (Unique cards already owned, imbued cards).

**Reverse lookups** (_To_ mode, "what turns into X"):

| Mode      | X must be in                 | Sources                                                                                          |
| --------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Transmute | `pool`                       | X's color, one rarity below X. A Legendary X also has the other Legendaries                      |
| Sidemute  | `monsterSidemute`            | Every Monster-banner card, any rarity                                                            |
| Sidemute  | `pool`, X not Monster-banner | X's color and rarity, plus **Black** cards of that rarity if X is Brown. Never any for a Black X |
| Tradepost | `pool` + `adds` − `removes`  | X's color and rarity, **X included**, no Monster-rarity sources                                  |

Then drop X from its own sources (except Tradepost), and drop sources blocked for the mode. X's
card set must be enabled, except for a `monsterSidemute` X. For Transmute, **X itself must be
reachable with the ticked energies**. If it isn't, there are no sources at all. A card that no mode
reaches "can't be reached by transmute, sidemute or Tradepost". Don't say "can't be obtained":
events and other routes are outside this data.

## Data format

`scripts/data/transmutes.json` comes from the external tool (gitignored, pasted in manually like
`treasures.json`/`weapons.json`). `npm run sync-transmute-rules` validates it and writes
`src/transmute/data/transmute-rules.json`, typed by `src/transmute/types/rules.ts`. The output is
about 55 KB minified, 20 KB gzipped.

```json
{
  "version": "1.19.004",
  "date": "2026-11-01",
  "modes": {
    "transmute": { "events": [], "cards": [] },
    "sidemute": { "events": [] },
    "tradepost": { "cards": [] }
  },
  "cards": { "7148": [9, 4] },
  "pool": [908],
  "monsterSidemute": [3447],
  "tradepost": { "adds": [51635], "removes": [13747] },
  "potions": [49747],
  "cannotBeSource": [
    {
      "id": "EXCEPTION-CURSE",
      "reason": "Cursed",
      "blocks": ["transmute", "sidemute"],
      "cards": [177094]
    }
  ],
  "castRequirements": { "885279": ["dex", "int", "str"], "72725": ["holy"] }
}
```

- **Ids are game ids** (`blightbane_id` on `CardData`; see the invariant in `src/shared/CLAUDE.md`).
- **`cards` uses `CardData`'s numbering**: `[banner 1–11, rarity 0–4]`. It covers **every card in the
  game data**: 2751 ids, enemy-only cards included (see "Which cards count as sources" below).
- **`modes`** is display-only: where each mode is offered ("Available at Alchemist, …").
- **Upstream prose is dropped**: the rule descriptions and `notes`. The tool implements those rules,
  so the sync script **warns** when the prose changes or a new note appears, instead of failing.
- **An id not in `cards` is "newer than the data"** (a patch landed before the next sync), which is
  different from "blocked". The search offers only cards that are in `cards`, so this state is only
  reachable from an old shared URL. Today the one Blightbane card missing from `cards` is Charged
  Chakram (`337481`), which belongs to a single puzzle mode and is correctly left out.
- **Lookups are built once at module scope** (like `EVENTS_BY_NAME` in Booty):
  - `pool` and the Tradepost list, each grouped by `color|rarity`;
  - `monsterSidemute` as a `Set`;
  - the blocked ids per mode;
  - all of `cards` grouped by `color|rarity`, for reverse-lookup sources.

  Never rebuild them per render.

- **Data ids missing from the live card cache are skipped**, with a dev-only `logger.warn`. That is
  the same drift story as Booty's `findUnmappedPools`.
- **JSON imports type `[9, 4]` as `number[]`**, so the module casts with `as unknown as
TransmuteRules` to keep the tuple type.

### Which cards count as sources: Cardex's `isNonCollectible`

The data's result lists (`pool`, `monsterSidemute`, `tradepost.adds`) hold only cards a player can
keep in their deck. **`cards` does not**: it lists all 2751. Upstream can't produce a reliable
deckable list either. Nothing in the game data marks one, and a scan of every way the game grants a
card would still miss routes.

So **deckable means `!isNonCollectible(card)`**, the same test Cardex uses (it moves to `shared/` in
Task 5). Nothing is dimmed or hidden behind a toggle. It needs the live `CardData` (category,
expansion, name), so **it can't run in the sync script**. Instead it runs at the one place ids
become `CardData`: the same step that already skips ids missing from the live cache. Every list
passes through that step (results from `pool`, `monsterSidemute`, Tradepost, and potions;
_To_-mode sources from `cards`; the search), so they're all narrowed by one check rather than one
filter per list. It removes 627 of the 1116 cards in Blightbane that are never a result,
including 334 of the 489 Monster-banner ones (Mudfang Fury among them). What remains is mostly
genuinely deckable (weapons, treasures, route-only cards), plus some noise. Exceptions are patched
in `isNonCollectible` as they turn up, which fixes Cardex too.

`isNonCollectible` also flags three cards that are in `pool`: Frost, Fire and Lightning Attunement.
They're technically reachable through Tradepost, but they aren't real playable cards, so leaving
them out is correct.

**A Monster-banner sidemute in _To_ mode is shown as a rule, not a list**: "Any Monster-banner card
can sidemute into this". Even after narrowing, it would be about 600 cards.

## Decisions already made

- **Name `Transmute`, path `/transmute`, folder `src/transmute/`.** It launches publicly at the end
  of this spec, with no beta period. While it is being built it stays `unlisted: true` (the
  `add-new-tool` default), so a half-built tool never shows on the landing page. Task 10 removes the
  flag and cleans up after development.
- **Filters**, all in the left panel:
  - Card search with suggestions.
  - Direction toggle: _From_ / _To_. Default _From_.
  - Mode toggle: _Transmute_ / _Sidemute_ / _Tradepost_, **always in that order**, whatever the
    control. Default _Transmute_. The control itself (slider, segmented control, radio buttons, …)
    is left to trial in the browser (Task 4).
  - Card sets: the shared `useCardSetFilters`, **without** a Core checkbox. Core (1), Extended (4)
    and the nil expansion (0) are always on in the game and can't be switched off.
  - Energies: Dex / Int / Str / Holy, with Skilldex's energy icons (`DexImageUrl`, …), all ticked by
    default. **They only affect the Transmute mode.** Show them disabled or hidden for the other two.
  - Formatting: **Show card art** and **Show Blightbane link** only, for now.
- **Card sets narrow the _results_, and energies gate _Transmute_ results** (see Game rules).
  Neither limits which card you can pick.
- **Results reuse Cardex's `ResultCard`, banner grouping, sort order and styling**, using the
  data's color and rarity. Clicking a result does nothing. Navigation goes through the Blightbane
  link only.
- **Search** is a case-insensitive name match ranked prefix-first, showing the top 5 suggestions,
  each with tiny artwork and the name. Cards sharing a name (`hasDuplicateName`) appear as separate
  suggestions keyed by `blightbane_id`, with something to tell them apart (see Task 5).
- **URL**: the selected card and **every filter option** live in the query string, Cardex-style,
  so a shared link reproduces the whole view. Formatting options stay out of the URL, as they do in
  Cardex, because they are a viewer preference, not part of the view.
  - `?card=<slug>` holds the selected card: the name lowercased with `_` for spaces, plus a
    `_<blightbane_id>` suffix only for `hasDuplicateName` cards.
  - `?dir=to` and `?mode=sidemute|tradepost` are written only when they differ from the defaults.
  - `?sets=` uses the existing `cardSetUrlCodec`, and `?energies=` uses **named** codes
    (`dex,int,str,holy`), the same as Skilldex requirements.

  The selected card is a query param rather than a `/transmute/[card]` route. That keeps one page
  component, so the Booty remount problem can't arise. Per-card OG previews aren't worth building,
  because card names are only known at runtime.

- **Filters persist to localStorage** under a new `codex_transmute_filters_v1`. The `codex_` prefix
  keeps the naming consistent, per the localStorage-key invariant in `src/shared/CLAUDE.md`.
- **The transmute fallback is worded without the offer size N.** In the game, N depends on how many
  card sets are enabled. The tool doesn't model it: an empty list gets its own fallback message, and
  a non-empty one gets a general line that doesn't depend on N.
- **Data arrives through the sync pattern**: `npm run sync-transmute-rules`, also run by `sync-all`.

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
- If present locally: `scripts/data/transmute-usage-examples.md`, the external tool's worked
  examples (Game rules above restates them).

**Where to stop: pause after every task for the user to check it.** Task 1 restructures Cardex's
most performance-sensitive component. A regression there would be invisible under later Transmute
work, which renders the same rows. Tasks 4–7 each change one panel's behavior, and each is easier to
judge alone. When a task is finished, mark it `COMPLETED` here, say what changed and which pages and
states to look at, and wait. The user runs the dev server.

- **Task 1 has no visible effect by design**: Cardex must look and behave exactly as before.
- **Task 2b has no visible effect**: check it through its temporary test.
- **Tasks 9 and 11 are the user's**: an agent prepares what it can and waits.

**Verification:**

- `npm run verify` after every task.
- `npm run build` after Tasks 1, 3 and 8, which touch shared components, `pages/` and URL handling.
- `npm run build && npm run check-sw` in Task 10, after Task 9 adds the `public/` images.
- Visual checks are named per task. Always compare desktop _and_ mobile widths, and a large result
  set (a Monster-banner sidemute, 444 cards) as well as a tiny one.

**Docs that change with the work:**

- **Root `CLAUDE.md`**:
  - "six tools" → seven, and the Main Features list.
  - The `/src` folder list.
  - Data Synchronization: `sync-transmute-rules`, `sync-all`'s sequence, and `whitelist-fields.js`
    now being shared by three scripts.
  - "Each hook's source differs" is unaffected.
- **`src/shared/CLAUDE.md`**: Key files gains the moved result-card components (and
  `isNonCollectible`, moved from Cardex in Task 5).
- **`src/cardex/CLAUDE.md`**: the `.result-card` invariants move to `src/shared/CLAUDE.md` along with
  the component. Leave a one-line pointer in Cardex's file.
- **New `src/transmute/CLAUDE.md`**, written in Task 8, covering:
  - The data format, and that color/rarity come from the data rather than Blightbane.
  - The rules the tool implements itself (Game rules above), and that the sync script warns when
    upstream's prose for them changes.
  - Blocked vs. unknown ids.
  - The energy table, `castRequirements` replacing the default, and access gating only Transmute.
  - The URL scheme.
- **`src/unfinished-specs/card-metadata.md`**: it says to "stop before `transmute`" because that is a
  card-to-card join. That stays true for the metadata file, since this tool takes transmute data
  through its own file. Add no transmute field there.

If any task turns out to need contradicting a documented invariant, raise it with the user rather
than rewriting the invariant.

**Comment style**: the non-obvious _why_, in a line or two. No restating the code or narrating the
history of a change.

## Tasks

### Task 1 — Move Cardex's result rows into `shared/` — COMPLETED

Transmute can't import from `src/cardex/`. Move these to `src/shared/components/`:

- `ResultCard` and its pieces (`CardArtwork`, `CardIcons`, `CardMetadata`).
- The banner-grouped list rendering from `CardResultsPanel`: the `cardsByBanner` grouping, the
  `results-cards__banner--<n>` styling and the cross-group entry stagger.
- The helpers they need (`getBlightbaneCardUrl` and whatever else `cardHelper.ts` lends them).

`CardStrikeBadge`/`struckTrigger` and the keyword pills are Cardex-only. Make them optional props or
slots rather than moving Cardex's tracking concepts into `shared/`. Exactly how to split
`ResultCard`'s 17 props is left to the implementation, with one constraint: **Cardex's output stays
pixel-identical**. The grouping must accept a color per card, so Transmute can pass the data's
color instead of `CardData.color`.

Check: Cardex at desktop and mobile with keywords, struck cards, hide-tracked, every formatting
toggle, and a large result set (scroll the whole list to confirm rows still render lazily with no
scrollbar jumps).

### Task 2 — Data: sync script and types — COMPLETED

`scripts/sync/sync-transmute-rules.js`, `npm run sync-transmute-rules`, an entry in `sync-all.js`,
and `src/transmute/types/rules.ts`. The script reuses `whitelist-fields.js` (whose `writeJson` now
handles non-array output), reports dropped upstream fields, and fails on:

- an id missing from `cards`;
- a non-numeric or duplicate id;
- an unknown color, rarity or `blocks` mode;
- an unexpected `requires` value;
- `count` not matching `cards`;
- Tradepost adds/removes not lining up with `pool`.

### Task 2b — Lookup module

`src/transmute/utils/`: the module-scope lookups from Data format, plus one function per direction
× mode returning the candidate ids, or a reason there are none:

- blocked;
- unknown to the data;
- X not in the mode's result list;
- X not reachable with the ticked energies;
- the White card.

It applies Game rules and nothing else. Card sets, the fallback and display stay in the UI.

Check: a temporary test, deleted afterwards, against the examples in Game rules:

- a Purple Uncommon transmute, with and without Holy (Concordance and Represent);
- a Black Rare sidemute (12 Brown Rares);
- a Monster-banner sidemute (Abolish: 443);
- Aura of Fear's sidemute (blocked) and transmute (Black Commons);
- Tradepost on a Monster-rarity card (nothing) and on a Black Legendary (source included);
- a Legendary transmute minus itself (Ceremony of Roses: 24 Purple Legendaries);
- _To_ for a Brown card (Black sources included), for a Black card (no sidemute sources), and for
  Oathbreaker (Tradepost only).

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
  - the direction toggle and the three-way mode toggle (Transmute, Sidemute, Tradepost in that
    order, default Transmute);
  - card sets (shared `useCardSetFilters`, with the Core checkbox hidden for Transmute only);
  - a new energy-filter hook with named URL codes;
  - formatting (card art, Blightbane link).
- A filter store at `codex_transmute_filters_v1`, with every mutator added to
  `TRACKED_FILTER_HANDLERS`.
- Render them in the left panel. Energy labels reuse Skilldex's icon-label pattern, so lift
  `renderRequirementFilterLabelIcon` into `shared/` if Transmute would otherwise copy it. Energies
  are disabled or hidden outside the Transmute mode.
- **The mode control is left to trial and error in the browser.** Try the existing slider and a
  segmented control (check `ButtonRow` first). The slider implies an ordered scale, which the three
  modes aren't.

Check: every control toggles, survives a reload, and resets. Cardex's card-set filter still shows
Core.

### Task 5 — Card search with suggestions

Move Cardex's `isNonCollectible` to `shared/` first. The search offers only cards that are in
`cards` and that it doesn't flag (see "Which cards count as sources").

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
- **A header that makes the mode unmistakable**: the direction (_turns into_ / _comes from_) and the
  mode. It should be visible without reading the filter panel.
- **A one-line subtext by the selected card**, explaining what the results are. One line per
  direction × mode, kept in one lookup so they're easy to tweak. The placeholders below are the
  user's to reword, and the placement is left to trial and error:
  - _From_, Transmute: "Cards one rarity higher, of the same banner color, that you can transmute
    into"
  - _From_, Sidemute: "Cards of the same rarity and banner color"
  - _From_, Tradepost: "Cards of the same rarity and banner color, this one included"
  - _To_, Transmute: "Cards one rarity lower, of the same banner color, that transmute into this
    one"
  - _To_, Sidemute: "Cards of the same rarity and banner color that sidemute into this one"
  - _To_, Tradepost: "Cards of the same rarity and banner color that Tradepost can swap for this one"

  "Same banner color" is false for Black → Brown sidemutes and for the Monster branch (any rarity).
  Those cases need their own line.

- Results grouped and sorted exactly like Cardex, by the data's color and rarity. Show rarity on
  Monster-branch results, since that list mixes rarities.
- A result count, plus how many results the filters hid, so an empty list explains itself.
- States:
  - no card selected;
  - card unknown to the data;
  - card blocked for this mode, showing the group's `reason` (copy may be keyed by group `id`);
  - Distant Memory's fixed text;
  - Transmute, _From_, same-color list emptied by energies or sets: the fallback message ("all
    choices come from {rarity} cards of the colors you have access to"), with the ticked energy
    icons;
  - Transmute, _From_, non-empty list: the general fallback line;
  - Transmute, _To_, selected card not reachable with the ticked energies: _"None of the energy
    colors you have access to will let you transmute into this card"_, with the ticked energy icons;
  - Sidemute, _From_, Black source: say the results are Brown;
  - Sidemute, _To_, Black card: no sources, with the rule as text;
  - Sidemute, _To_, a `monsterSidemute` card: "Any Monster-banner card can sidemute into this",
    with no list;
  - Tradepost on a Monster-rarity card, or any empty Tradepost list: nothing, and the card stays in
    the deck;
  - a card no mode reaches in this direction: "can't be reached by {mode}";
  - every result hidden by the card-set filter.
- **Optional, the user decides in the browser**:
  - an "Only appears once unlocked" note on Metaprogress cards and Rend/Claw/Maul;
  - the sidemute potion top-up line;
  - a "Tradepost only" badge on `tradepost.adds` cards;
  - an "Available at …" line from `modes`.

Check: each state above. Outside the Transmute mode, check that toggling energies changes nothing.
A Monster-banner sidemute (444) and a small Legendary list. Card art on and off. Desktop and mobile.

### Task 7 — URL state

The `?card`, `?dir`, `?mode`, `?sets`, `?energies` params, read on load and written on change.
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
- Re-run `npm run sync-transmute-rules` against the latest external file and check the counts and
  `version` it prints.
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

### Task 12 — Optional: give Cardex's bannerless cards their real banner

Not part of Transmute, which is why it comes last. Blightbane returns 17 cards with no banner
(`color: 0`): Songs, Totems, Dark Ascension I–III, Deadly Effigy and InfernalOffering. Cardex
renders them but can't filter them by banner. The data's `cards` map has their real color (Brown or
Black).

- **Cardex can't import from `src/transmute/`.** The color map has to reach `shared/` first. One
  option: the sync script writes a separate `src/shared/data/card-colors.json`, and Transmute reads
  that too, instead of a copy in `transmute-rules.json`. The patch then belongs in
  `cardsResponseMapper.ts`, beside the Infernal Racket override.
- **Decide the scope with the user first**: fill in only the 17 bannerless cards, or apply all 96
  corrections. The second also moves the 70 Monster-rarity cards out of Cardex's Monster banner
  (Aura of Fear to Black) and makes the hand-written Infernal Racket override redundant. That is a
  visible change to Cardex's banner filter, not just a fix.

Check: Cardex's banner filter with the affected banners, and a search for a Song and a Totem.

Once every task is `COMPLETED`, delete this spec.
