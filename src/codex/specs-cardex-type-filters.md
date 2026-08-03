# Spec: Cardex "Type" filters

Cardex gained a **Type** filter group (search panel, between *Rarities* and *Extras*) filtering cards
on the Blightbane `type` field, plus a *Show card type* results-formatting checkbox.

**Status: the filter itself is done and working.** `npm run verify` passes. What remains is a layout
pass over the new checkbox group, one open design question about where the type belongs in a result
card, and one deliberate deferral around weekly challenges. All three are described in *Tasks*.

The work is on `feature/cardex-type-filters`, staged but **not committed** — `git diff --cached` shows
it all at once.

## What already exists

| Concern | Where |
| --- | --- |
| Filter options (Melee…Corruption) + `CardType` value object | `types/filters.ts` |
| `ShowCardType` formatting option, `cardTypes` on the filter cache | `types/filters.ts` |
| Filter hook (state, index predicate, Select all/none, bulk enable, reset) | `hooks/useSearchFilters/useCardTypeFilters.ts` |
| Type emoji: `indexToEmojiMap` + both accessors | `hooks/useSearchFilters/useCardTypeFilters.ts` |
| Wiring: tracking, caching, reset, weekly optimization, card matching | `hooks/useSearchFilters/useAllCardSearchFilters.ts` |
| `shouldShowCardType` flag + label | `hooks/useSearchFilters/useFormattingCardFilters.ts` |
| `Type` checkbox group + emoji labels in the search panel | `components/SearchPanels/CardSearchPanel/index.tsx` |
| `card-type` checkbox layout | `components/SearchPanels/shared/FilterGroup/Checkbox/index.module.scss` |
| **Provisional** render in the result card | `components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx` + its `.module.scss` |

Paths are relative to `src/codex/`.

Behaviour as implemented:

- Six types, **all defaulting to true**; `Select all` on and `Select none` off by default. Built on
  `createFilterHook`, so the group behaves like Banners — nothing bespoke.
- Filtering is `isCardTypeSelected(card.type)` ANDed with the other filters in `isCardMatching`,
  **except** type 7 (Monster), which defers to `shouldIncludeMonsterCards`.
- Weekly-challenge optimization calls `enableCardTypeFilters(allCardTypes)`, mirroring
  `enableRarityFilters(allRarities)`, so every type is switched on.
- Caching goes through `cardTypes` on `CardCodexSearchFilterCache`, with all three mutators listed in
  `TRACKED_FILTER_HANDLERS.cardType` — that list is what actually makes changes reach localStorage.

No cache version bump was needed, and none should be added: `createFilterHook` merges the cached blob
gating on `key in defaultFilters`, so an older blob without `cardTypes` falls back to the defaults and
the missing key is written on the next debounced save (see the `codexFilterStore` invariant in
`src/codex/CLAUDE.md`).

## Decisions already made

Do not re-litigate these; they are settled.

- The group is titled **Type** and sits between *Rarities* and *Extras*.
- Checkboxes look like the plain (card-set/requirement) ones, **not** the coloured banner/tier ones.
  Colouring them is a separate idea, out of scope here.
- `Show card type` defaults to **false** — it is new and additive, and the title row is already busy.
- **Type 7 gets no checkbox.** It is kept in `indexToValueMap` as `'Monster'`, so those cards render
  a label rather than an empty span with *Show card type* enabled (`getValueFromIndex` returns `''`
  for unmapped indices). ⚠️ **Task 1 disproved the reasoning originally recorded here** — type 7 is
  *not* a card-wide monster marker and `hasMonsterType` is gone. See *Task 1 findings* below; the
  no-checkbox decision still stands, but for a different reason.
- **Index 5 (Move) gets no checkbox.** The type is never used in the game, so a checkbox could only
  ever be dead UI. Unlike Monster it needs no `indexToValueMap` entry — no card carries the index.

Type indices, counted over the **full** `cards-codex` response (2716 cards) — the exact payload
Cardex fetches, so these counts include monster-bannered cards:

| Index | Type | Cards | Examples |
| --- | --- | --- | --- |
| 0 | Melee | 402 | Assassinate, Cranium Blow, Garrote, Plague Strike |
| 1 | Magic | 215 | Cloudkill, Charged Blade, Afterburn, Call the Storm |
| 2 | Ranged | 84 | Quickshot, Aimed Shot, Poison Arrow, Double Tap |
| 3 | Utility | 1635 | Agile, Alchemist, Arcane Ward, Emerald Prism |
| 4 | Divine | 219 | Confession, Renew, Radiant Recovery, Singular Focus |
| 5 | Move | 0 | no checkbox — never used in the game |
| 6 | Corruption | 151 | Snare, Bloodmoney, Ransom, Shakedown |

An earlier sweep restricted to the regular banners reported far lower counts and **zero** type-7
cards, which is what produced the mistaken "type 7 = Monster" premise. Type 7 has 10 cards; it is
listed under *Task 1 findings* rather than in this table, since it is not a filterable type here.

## How to work through this spec

**What to read first.** Root `CLAUDE.md` and `src/codex/CLAUDE.md`. Three things there constrain this
work:

- *Every filter mutator must be listed in `TRACKED_FILTER_HANDLERS`.* Nothing type-checks it; a
  mutator left off applies visibly but never persists and reverts on reload. Only relevant here if a
  task adds a new mutator to `useCardTypeFilters` — the three existing ones are already listed.
- *Adding or removing a filter option does not need a `codexFilterStore.ts` version bump.* If a task
  renames an enum **value**, that silently resets those users to the default (all types on), which is
  acceptable and still not a reason to bump — the shared blob also holds `struckCards`, which users
  cannot reconstruct.
- *`getActualExpansion`/`getActualColor` in `cardsResponseMapper.ts` run at map time, not render time.*
  `card.type` is currently passed through untouched. If a task ever needs to remap a type value, it
  belongs there — and after changing it you must force a **Resync data** (or clear `codex_cards_v2`)
  or you are looking at cards mapped by the old code.

**Where to stop.** **Pause after task 1** and get confirmation before starting task 2. Task 1 is a
look-and-adjust pass over the search panel; task 2 restructures the result-card title row. Chaining
them means judging a new result-card layout while the panel beside it is still being tuned, and either
mistake is easier to spot alone. Task 3 is a question to answer, not code to write — see its wording.

**How it gets verified.** `npm run verify` after every task; no `npm run build` needed unless a task
starts touching `pages/` or a data hook, which none of them should. Both tasks 1 and 2 are primarily
**visual**, so run `npm run dev`, open `/cardex`, enter a keyword or click *Show all cards matching
only the filters*, and compare these states — "looks fine" in one routinely misses the others:

- **card art on and off** (*Show card art*)
- **card set shown and hidden** (*Show card set*) — the card set and card type compete for the same
  free space on the title row, so hiding one changes where the other lands
- **card type on and off** (*Show card type*, default off — turn it on)
- **mobile width** — the title row is the tightest part of this layout and only mobile exposes it

**Which docs change with the work.** `src/codex/CLAUDE.md` has no per-filter listing, so task 1
invalidates nothing there. Two invariants are worth *adding* once settled:

- The **Monster-folding rule** — monster rarity, monster banner *and* monster type all route through
  the single *Include Monster cards* checkbox, and none of the three appears in its own filter group.
  Nothing in the code makes that three-way pairing discoverable; a fourth monster-ish field would
  otherwise get its own checkbox by default.
- Whatever **placement rule** task 2 settles on, if it is load-bearing (e.g. "card type and card set
  never share the title row").

A change that contradicts a documented invariant gets raised with the user, not quietly rewritten.

**Comment style.** The non-obvious *why*, in a line or two — no restating the code. The two
provisional-placement `TODO`s (one in `ResultCard/index.tsx` above the card-type span, one above
`.result-card__card-type` in its stylesheet) exist to be **deleted by task 2**.

## Tasks

### 1. Check the Type group's layout, and verify the Monster folding

**Monster folding: COMPLETED — it was broken, and is now fixed.**

**Layout: still open** — needs the user's dev server. `checkbox-label--card-type` currently only
overrides mobile (`50%` width), inheriting the default `33.33%` desktop column — the same rule
`--requirement` uses. Six types plus `Select all`/`Select none` is eight checkboxes, so at three
columns the final row is short by one, and at two columns (mobile) it divides evenly. The labels
differ in width (Melee … Corruption). Adjust the width rule **only** if the real labels wrap,
truncate, or leave an awkward gap — an even grid is not worth a bespoke rule on its own.

#### Task 1 findings

The folding was verified against the live `cards-codex` payload (2716 cards) rather than by eye, since
the question is a data question. Cross-tabulating the three monster signals, with banner counted
**after** the `Infernal Racket` → black remap in `getActualColor`:

| `rarity === 4` | `color === 11` | `type === 7` | Cards |
| --- | --- | --- | --- |
| no | no | no | 1712 |
| no | no | **yes** | 1 (`Infernal Racket`) |
| no | **yes** | no | 9 |
| no | **yes** | **yes** | 1 |
| **yes** | **yes** | no | 985 |
| **yes** | **yes** | **yes** | 8 |

So ~1003 monster cards exist, but **only 10 carry type 7** — the other 994 carry an ordinary type
(216 Melee, 96 Magic, 31 Ranged, 590 Utility, 25 Divine, 36 Corruption). **Type 7 is not the monster
type.** It is a rare type that mostly co-occurs with the monster banner.

That broke the second assertion. Rarity 4 and banner 11 are absent from their groups' `indexMap`s, so
for a monster card those filters have nothing to say and the deferral is total. The Type group is
different: its `indexMap` covers 0,1,2,3,4,6 — exactly the types 994 monster cards have — so monster
cards *are* addressable by Type checkboxes. With *Include Monster cards* on and `Select none`,
`hasMonsterType` was false for those 994, so they fell through to `isCardTypeSelected(card.type)` and
the Type group vetoed cards the user had explicitly opted into: **10 of 1003 monster cards appeared
instead of all 1003.** The other direction never leaked, because the rarity and banner lines still
catch every monster card — which is why this was invisible outside that one filter combination.

**The fix:** `passesCardTypeFilter` now defers on the card *being a monster card*
(`hasMonsterRarity(card) || hasMonsterBanner(card)`), matching what the other two lines mean.
`hasMonsterType` had no remaining caller and was deleted from `cardHelper.ts`, since "type 7 means
monster" was the false premise itself.

Re-verified over the same payload: 0 monster cards leak with the Extras checkbox off, all 1003 appear
with it on plus `Select none`, and ticking a single type still yields 0 wrong-type cards.

**Type 7 decisions (confirmed with the user):** no checkbox — 9 of the 10 cards are monster cards
already governed by *Include Monster cards*, leaving a 1-card population that would be dead UI — and
`indexToValueMap` keeps `7: 'Monster'` so the result card still renders a label.

**One loose end, deliberately left alone.** `Infernal Racket` is type 7 but `getActualColor` remaps it
to the black banner because the game treats it as a normal card. It is therefore *not* a monster card
under the new predicate, so it is now filterable by the Type checkboxes — but no checkbox maps to
index 7, so **no Type selection can show it** while every other collectible card is reachable. With
*Show card type* on it also reads "Monster" despite its black banner. Both are single-card cosmetic
oddities on a card the game itself treats inconsistently; raise them again only if a second such card
appears.

### 1b. Type emoji (DONE for the checkboxes, provisional in the result card)

Each type has an emoji, from `indexToEmojiMap` in `useCardTypeFilters.ts`:
⚔️ Melee · 🔮 Magic · 🏹 Ranged · 🛠️ Utility · ☀️ Divine · 🖤 Corruption · 👹 type 7.

The map is keyed by **index**, but the checkboxes are keyed by filter **name**, so the emoji is
reachable both ways and neither caller rebuilds the mapping:

- `getCardTypeEmojiFromName(filter)` — a module-level export (not on the hook), since
  `CardSearchPanel` builds its labels outside any hook result. `valueToEmojiMap` derives from
  `indexMap`, so `Select all`/`Select none` are absent and fall through to `''` — which is exactly
  what `getCardTypeFilterLabel` tests to render them as plain labels.
- `getCardTypeEmojiFromIndex(index)` — on the hook, `useCallback`-wrapped to match the factory's own
  getters, so `ResultCard`'s `memo` still holds.

**Checkboxes: settled.** Emoji prepended to the label via `getFilterLabel`, the same hook the Rarities
and Extras groups already use. Spacing comes from `.filter-emoji` (`0.375rem`, a shade tighter than
`.filter-icon`'s `0.5rem`), sized one step below the label text because the emoji glyphs read heavier
than the outline icons at equal size.

**Result card: emoji-only, but the placement is still task 2's question.** The type now renders as
*just* the emoji — no text — with the name on a `title` attribute so it stays identifiable on hover.
It still sits where the provisional text sat (trailing the card set on the title row) and the `TODO`s
still stand; **task 2 is unchanged and still open.** What the emoji does change is the weighing:

- The old text span reserved a fixed `6rem` (`4.5rem` mobile) with truncation. One glyph needs
  neither, so the rule is now width-less and `flex-shrink: 0` — it no longer competes with the card
  name for title-row width, which was the main objection to leaving it on the title row.
- That weakens the case for the *own row* option (vertical space for one glyph) and largely collapses
  the distinction between *merged with the card set* and leaving it where it is.
- The *icon in `CardIcons`* option is now closer to a straight swap: emoji instead of six new SVG
  components, no `viewBox` work, and that column already centres against the full row height.

### 2. Decide where the card type shows in a result card

**This is the one genuinely open design question, and it is the reason this spec exists.** The user
asked for the *Show card type* checkbox before deciding where the type should appear.

Current state is an explicit placeholder: the type renders as a `<span>` trailing the card set on the
title row, with `TODO`s marking it provisional. It is readable, but it is not a design.

⚠️ **Read task 1b first** — the span now holds a single emoji rather than text, which removes its
fixed width and therefore most of the width pressure the options below were weighed against. The
options are still the options; the trade-offs shifted.

The constraint: `result-card__card-set` uses `margin-left: auto` to push itself to the right edge, and
the type span does the same. When **both** are shown they queue at the right and compete for a title
row that also holds the card name and — when descriptions are off — the matching-keywords text. The
name has three width variants (`--enlarged`, `--enlarged-more`) that already react to which other
elements are visible, so adding a permanent competitor there has knock-on effects.

Options worth weighing:

- **Its own row** under the title, the way keywords get one when descriptions are off (see
  `shouldShowKeywordsOnSeparateRow` and `--own-row`). Costs vertical space per card.
- **Merged with the card set** into one right-aligned cell (`Melee · Eclypse`), so the row gains no
  new competitor for width. Needs a decision about what shows when only one of the two is enabled.
- **An icon** in `CardIcons` instead of text — that column already centres against the full row
  height, so it costs no title-row width at all. Needs one icon per type (six), and per the root
  `CLAUDE.md`, apparent icon size depends on viewBox fill, so equal CSS sizes will not look equal;
  `npm run icon-viewbox -- <IconName>` helps. Also note those icon components are shared with the
  search-panel filters, so a viewBox change affects both.

Whichever is chosen: delete both provisional `TODO` comments, and verify across the four states listed
under *How it gets verified*.

### 3. Confirm whether type belongs in weekly-challenge optimization

**Answer the question before writing code** — it is a game-rules question, so ask the user if unsure.

The optimization currently enables **all** types, mirroring how it enables all rarities. That is
correct as long as card type never constrains what scores in a weekly challenge. If some challenges
*are* type-scoped, the shape of the fix is:

1. add a `cardTypes: Set<CardType>` to `WeeklyChallengeFilterData` in `types/filters.ts`,
2. populate it in `hooks/useWeeklyChallengeFilterData.ts`,
3. export an `isCardTypeIndexInSelection(index, selected)` helper from `useCardTypeFilters.ts` —
   copy the shape of `isBannerIndexInSelection`, which exists precisely because
   `setFiltersFromWeeklyChallengeData` must match against filters it has just set but not yet
   committed to state,
4. pass it as `isCardTypeSelected` in that function's `isCardMatching` call, replacing the current
   `() => true`.

Left out deliberately until a challenge needs it — building it speculatively would add a fourth
uncommitted-state code path for no observable behaviour.
