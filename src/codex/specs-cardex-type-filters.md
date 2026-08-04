# Spec: Cardex "Type" filters

Cardex gained a **Type** filter group (search panel, between *Rarities* and *Extras*) filtering cards
on the Blightbane `type` field, plus a *Show card type* results-formatting checkbox.

**Status: everything in this spec is COMPLETED.** `npm run verify` passes. Tasks 1, 1b, 2 and 3 are all
closed — see each for what was decided and, for task 1, the bug it turned up. The one thing knowingly
left open is cosmetic: the metadata pill's vertical alignment against the card name, which the user is
tweaking by eye (see task 2).

The work is on `feature/cardex-type-filters`. The filter group and its wiring are committed
(`21f36b2`); the task 1–3 work on top of it is not yet.

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
| Metadata pill (type emoji + card set) in the result row | `components/ResultsPanels/CardResultsPanel/ResultCard/CardMetadata.tsx` + its `.module.scss` |
| Keywords forced to their own row on mobile | `components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx` |

Paths are relative to `src/codex/`.

Behaviour as implemented:

- Six types, **all defaulting to true**; `Select all` on and `Select none` off by default. Built on
  `createFilterHook`, so the group behaves like Banners — nothing bespoke.
- Filtering is `isCardTypeSelected(card.type)` ANDed with the other filters in `isCardMatching`,
  **except** for monster cards (`hasMonsterRarity || hasMonsterBanner`), which defer to
  `shouldIncludeMonsterCards`. This originally keyed on type 7 instead — see *Task 1 findings* for why
  that was wrong.
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
  Colouring them is a separate idea, out of scope here. They do carry a type emoji — added later, see
  task 1b.
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

**Where to stop.** No longer applies — all tasks are closed. Kept for the record: the original
instruction was to pause after task 1 so a new result-card layout was not judged while the panel beside
it was still being tuned. That held; tasks 1, 1b and 2 were each confirmed by the user before the next
began, and task 2 in particular went through three layouts that way.

**How it gets verified.** `npm run verify` after every task — it passes. No `npm run build` was needed:
nothing here touches `pages/` or a data hook. The layout work is **visual**, so it was checked in the
user's dev server on `/cardex` across these states:

- **card art on and off** (*Show card art*)
- **card set shown and hidden** (*Show card set*) — with both halves of the pill, only one, or neither,
  since the pill changes shape and drops its divider
- **card type on and off** (*Show card type*, default off — turn it on)
- **mobile width** — the tightest case, and the one that rejected two of task 2's layouts
- **descriptions on and off, on mobile** — the two paths into `--own-row` keywords must agree

The Monster-folding fix was **not** verified visually. It is a data question, so it was checked by
simulating `isCardMatching` over the live `cards-codex` payload (2716 cards) — see *Task 1 findings*.
That is the right tool for it: the failure was a specific filter combination over ~1000 cards, which
eyeballing a result list would plausibly have missed.

**Which docs change with the work.** `src/codex/CLAUDE.md` has no per-filter listing, so nothing there
was invalidated. Two invariants were **added** to it (both DONE), chosen because neither is faster to
work out from the code than to read:

- The **Monster-folding rule**, in its corrected form — monster cards are rarity 4 / banner 11, *not*
  type 7, and any filter group whose `indexMap` can address them must defer to *Include Monster cards*.
  The code shows *that* the type filter checks rarity and banner; it cannot show that type 7 looks like
  a monster marker and isn't. That trap is the whole reason the entry exists.
- The **name-shrink dependency** — `.result-card__name`'s `flex-shrink: 1` + `min-width: 0` are what
  keep the pill at the row's right edge. Two innocuous-looking properties whose purpose is invisible in
  place, so deleting them reads as safe cleanup.

Deliberately **not** added: the emoji accessors, the pill's structure, and its font sizing. All three
are plain from the code and would just be restating it.

⚠️ For the record: the Monster-folding bullet as *originally* written in this section named monster
**type** as the third signal routing through the Extras checkbox. That was the false premise task 1
disproved. It was raised with the user and corrected, not silently rewritten — per the rule below.

A change that contradicts a documented invariant gets raised with the user, not quietly rewritten.

**Comment style.** The non-obvious *why*, in a line or two — no restating the code. The two
provisional-placement `TODO`s were deleted by task 2, as planned.

## Tasks

### 1. The Type group's layout, and the Monster folding — COMPLETED

**Monster folding: it was broken, and is now fixed.** See *Task 1 findings*.

**Layout: no change needed.** `checkbox-label--card-type` keeps the default `33.33%` desktop column and
its mobile `50%` override — the same rule `--requirement` uses. Six types plus `Select all`/`Select none`
is eight checkboxes, so the last desktop row is short by one and mobile divides evenly. Checked in the
browser with the real labels (Melee … Corruption) plus their emoji: nothing wraps or truncates, so the
uneven final row was left alone rather than given a bespoke width rule.

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

### 1b. Type emoji — COMPLETED

Each type has an emoji, from `indexToEmojiMap` in `useCardTypeFilters.ts`:
⚔️ Melee · 🔮 Magic · 🏹 Ranged · 🛠️ Utility · ☀️ Divine · 🌙 Corruption · 👹 type 7.
(The map is the source of truth — these are listed for orientation and the user tunes them by eye.)

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

**Result card: emoji-only.** The type renders as *just* the emoji — no text — with the name on a
`title` attribute so it stays identifiable on hover. Dropping the text is what made the *merged with
the card set* option in task 2 viable: a glyph plus a set name fits one pill, two text labels would
not have.

### 2. Where the card type shows in a result card — COMPLETED

**Settled: merged with the card set into a `CardMetadata` pill on the title row.** Both provisional
`TODO`s are deleted. The route there is worth recording, because two intermediate layouts were built
and rejected on the way and neither should be re-proposed.

**What was built:** a new `CardMetadata` component — a sibling of `CardArtwork`/`CardIcons` — rendering
`(type emoji │ card set)` as one backplated pill, `margin-left: auto` to the right edge of the title
row. A 1px divider element renders only when both halves are shown, so a one-sided pill has no stray
rule. `flex-shrink: 0` keeps the pill intact and makes the card name absorb any squeeze; the pill holds
a closed list of seven set names, so its width is bounded. `border-radius` equals its height, the same
round-ends idiom as the icon pill in `CardIcons`.

**Rejected on the way, with reasons:**

1. *Vertical stack as a fourth row column* (`[artwork][icons][content][metadata]`, set above type).
   Looked fine on desktop, bad on mobile: the card set carried a fixed `8rem`/`6rem` width inherited
   from the title row, which ate description space the whole time — including on the many rows where
   the set name is just `Core`.
2. *Same stack with the fixed width dropped* (`width: auto`). Reclaimed 2–3.5rem on short set names but
   did nothing for long ones (`Metamorphosis`), and made the column edge ragged per row. Not enough.

The pill fixes both because one horizontal unit is narrower than two stacked elements *and* gives the
row a single right-hand anchor instead of two elements competing for `margin-left: auto`.

**Mobile keywords moved with it.** The title row now carries name + keywords + pill, which does not fit
a phone. `shouldShowKeywordsOnSeparateRow` gained `|| isMobile` (via `useBreakpoint`), reusing the
existing `--own-row` path and its struck/hidden variants rather than adding markup. So the keywords are
on their own row when the description is off **or** on mobile.

**Knock-on change to the card name.** `.result-card__name` had a hard `width: 10rem` (up to `14rem`
enlarged). Against a non-shrinking pill that overflowed the row or pushed the pill off the edge on
narrow widths, so it gained `flex-shrink: 1` + `min-width: 0` — the widths are now preferred sizes that
truncate under pressure, not fixed ones. This is load-bearing for the pill staying at the edge.

**Vertical alignment: settled with a nudge** (`position: relative; top: 0.0625rem`). The pill's text
sat slightly high against the card name because the pill centres its own children — so it has no
baseline of its own and `align-self: baseline` is a **no-op** on it; what reads as misalignment is the
border and padding offsetting the text inside an already-centred box. The alternative was
`align-items: baseline` on the pill, which additionally needs an explicit height on the divider (it
currently relies on `align-self: stretch`). The nudge won as the contained option. Don't "fix" it back
to a baseline rule without also handling the divider.

### 3. Whether type belongs in weekly-challenge optimization — COMPLETED

**Confirmed with the user: no. Card type never constrains what scores in a weekly challenge**, so
enabling all types is correct and no code change is needed. `setFiltersFromWeeklyChallengeData` keeps
its `enableCardTypeFilters(allCardTypes)` call and its `isCardTypeSelected: () => true`.

Kept below only as the shape of the fix **if** a type-scoped challenge ever appears:

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
