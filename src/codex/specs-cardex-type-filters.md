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
| `hasMonsterType` predicate | `utils/cardHelper.ts` |
| Filter hook (state, index predicate, Select all/none, bulk enable, reset) | `hooks/useSearchFilters/useCardTypeFilters.ts` |
| Wiring: tracking, caching, reset, weekly optimization, card matching | `hooks/useSearchFilters/useAllCardSearchFilters.ts` |
| `shouldShowCardType` flag + label | `hooks/useSearchFilters/useFormattingCardFilters.ts` |
| `Type` checkbox group in the search panel | `components/SearchPanels/CardSearchPanel/index.tsx` |
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
- **Type 7 (Monster) gets no checkbox.** Monster cards are governed by *Include Monster cards* in
  Extras, exactly as monster rarity (4) and monster banner (11) already are: `hasMonsterType` joins
  `hasMonsterRarity`/`hasMonsterBanner` in `cardHelper.ts`, and index 7 is absent from both the enum
  and `indexMap`. It **is** kept in `indexToValueMap` as `'Monster'` — monster cards still appear in
  results when the Extras checkbox is on, and would otherwise render an empty span with *Show card
  type* enabled, since `getValueFromIndex` returns `''` for unmapped indices.
- **Index 5 (Move) gets no checkbox.** The type is never used in the game, so a checkbox could only
  ever be dead UI. Unlike Monster it needs no `indexToValueMap` entry — no card carries the index.

Type indices, from a sweep of the Blightbane API across all banners × expansions 0–7 (distinct card
counts, for orientation only — do not treat as authoritative):

| Index | Type | Cards | Examples |
| --- | --- | --- | --- |
| 0 | Melee | 158 | Assassinate, Cranium Blow, Garrote, Plague Strike |
| 1 | Magic | 113 | Cloudkill, Charged Blade, Afterburn, Call the Storm |
| 2 | Ranged | 49 | Quickshot, Aimed Shot, Poison Arrow, Double Tap |
| 3 | Utility | 866 | Agile, Alchemist, Arcane Ward, Emerald Prism |
| 4 | Divine | 157 | Confession, Renew, Radiant Recovery, Singular Focus |
| 5 | Move | 0 | no checkbox — never used in the game |
| 6 | Corruption | 98 | Snare, Bloodmoney, Ransom, Shakedown |
| 7 | Monster | 0 | no checkbox — folded into *Include Monster cards* |

That sweep reaches only the regular banners, so it returns zero type-7 cards even though monster cards
exist. **The Monster folding is therefore still unverified against real data** — see task 1.

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

Two things, both in the browser; neither should need much code.

**Layout.** `checkbox-label--card-type` currently only overrides mobile (`50%` width), inheriting the
default `33.33%` desktop column — the same rule `--requirement` uses. Six types plus
`Select all`/`Select none` is eight checkboxes, so at three columns the final row is short by one, and
at two columns (mobile) it divides evenly. The labels differ in width (Melee … Corruption). Adjust the
width rule **only** if the real labels wrap, truncate, or leave an awkward gap — an even grid is not
worth a bespoke rule on its own.

**Monster folding.** This is the part no automated check covers, and the API sweep above could not
confirm it. In the browser, with monster-bannered cards in the results:

- *Include Monster cards* **off** → no monster card appears, regardless of which Type checkboxes are
  ticked (including all of them).
- *Include Monster cards* **on** → monster cards appear even with **every** Type checkbox unticked
  (use `Select none`).
- With *Show card type* on, a monster card's type reads **Monster**, not blank.

If any of those three fails, the bug is in `passesCardTypeFilter` in `useAllCardSearchFilters.ts` or
in `indexToValueMap` in `useCardTypeFilters.ts`.

### 2. Decide where the card type shows in a result card

**This is the one genuinely open design question, and it is the reason this spec exists.** The user
asked for the *Show card type* checkbox before deciding where the type should appear.

Current state is an explicit placeholder: the type renders as a `<span>` trailing the card set on the
title row, styled as a narrower card set (`result-card__card-type`), with `TODO`s marking it
provisional. It is readable, but it is not a design.

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
