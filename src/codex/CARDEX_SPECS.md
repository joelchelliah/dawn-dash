# Cardex spec — Monster banner & rarity checkboxes, NIL-expansion rename

Status: **planned, not implemented.**

## Problem

Cardex currently treats "is this a monster card?" as a single boolean derived from
`expansion === 0`, exposed as one `Include monster cards` checkbox in the Extras group.

That conflation is wrong in two ways:

1. **Expansion 0 is not "the monster expansion".** It is Blightbane's *nil / unset* expansion
   bucket. Genuinely non-monster cards land there (Monolith, Pacified, the Battlespears, Pirate
   Inks, …), which is why `cardsResponseMapper.ts` maintains hand-written `ACTUALLY_*_CARDS` lists
   to move them out. Commit `7923c9b` said this out loud — *"There are some cards in the monster
   expansion (0) that are not really monster cards"* — and introduced a
   `NOT_REALLY_MONSTER_CARDS` blacklist plus an `isReallyMonsterCard` helper to compensate.
   Commit `3cc3eba` deleted both, moving the exceptions into `getActualExpansion`.
2. **Monster-ness is really three independent data axes**, and only one of them has a UI control:

   | Axis | Value | Filter group | Has a checkbox today? |
   | --- | --- | --- | --- |
   | Banner | `color === 11` | Banners | ❌ no — escape-hatched |
   | Rarity | `rarity === 4` | Rarities | ❌ no — escape-hatched |
   | Expansion | `expansion === 0` | Card sets | ❌ no — escape-hatched |

   Because none of the three has a checkbox, `useAllCardSearchFilters` needs three escape hatches
   that all funnel into the same `shouldIncludeMonsterCards` flag
   ([useAllCardSearchFilters.ts:199-207](hooks/useSearchFilters/useAllCardSearchFilters.ts#L199-L207)).

## Decision

**Banner and rarity become real filter dimensions; nil expansion stops being a monster signal.**

- Add a **Monster** checkbox to the Banners group (color `11`).
- Add a **Monster** checkbox to the Rarities group (rarity `4`).
- Remove the `Include monster cards` extra filter entirely.
- Nil-expansion cards are **visible by default** — they are no longer gated on anything. Monster
  visibility is decided solely by the two new checkboxes.
- Rename all `*_MONSTER_EXPANSION` / `hasMonsterExpansion` naming to `*_NIL_EXPANSION` /
  `hasNilExpansion`, since expansion 0 means "unset", not "monster".
- Merge `isNonCollectibleRegularCard` + `isNonCollectibleMonsterCard` into a single
  `isNonCollectible`.

### Why banner is the better signal

`color === 11` is already a first-class banner everywhere *except* the filter UI:

- `$color-banner-11: #300` and its `$banner-index-to-color-map` entry already exist in
  [_colors.scss:100-113](../styles/_colors.scss#L100-L113).
- `CardResultsPanel` already groups results by `card.color`, so color-11 groups already render.
- Only `$banner-name-to-color-map` lacks a `Monster` entry — because no checkbox exists to name.

Meanwhile `color` receives almost no hand-maintained correction (one case, `Infernal Racket → 9`),
versus ~30 names across `getActualExpansion`'s four lists.

## Non-goals

- **Not** replacing `getActualExpansion`'s `ACTUALLY_*_CARDS` lists with a banner-driven rule.
  That is a plausible follow-up (see [Follow-up](#follow-up)) but needs API data first.
- **Not** changing what the two `NON_COLLECTIBLE_*` category lists contain.

## Behavioral decisions

| Question | Decision |
| --- | --- |
| Monster in Banners' `Select all` | **Included**, like any other banner |
| Weekly challenge behavior | Monster banner is **always enabled**, regardless of challenge data |
| Monster banner default | **Off** (matches today's `IncludeMonsterCards: false`) |
| Monster rarity default | **Off** |
| Rarities' `Select all` | N/A — the rarity group has no `SharedFilterOption`; do not add one |
| Nil-expansion / rarity-4 escape hatches | **Removed.** Banner + rarity checkboxes decide |
| `isNonCollectible*` | **Merged into one function** |

### ⚠️ The two category lists are disjoint — do not naively union them

`NON_COLLECTIBLE_CATEGORIES` = `3, 6, 7, 8, 13, 16, 19`
`NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION` = `1, 4, 11, 12, 14, 17`

**Overlap: none.** Categories 1 (Items), 4 (Enchantments), 12 (Affixes) etc. are non-collectible
*only* in nil expansion. Unioning the lists would mark **every Item and Enchantment in the game**
non-collectible — a large, visible regression.

**Therefore:** the two category lists are selected between with an if/else on nil expansion, since
they are mutually exclusive by construction. The name list applies universally.

```ts
export const isNonCollectible = (card: CardData) =>
  NON_COLLECTIBLE_CARDS.some((name) => name.toLowerCase() === card.name.toLowerCase()) ||
  (hasNilExpansion(card)
    ? NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION.includes(card.category)
    : NON_COLLECTIBLE_CATEGORIES.includes(card.category))
```

This is behavior-preserving: the old pair of functions was already an if/else in disguise — the
regular branch was guarded by `!hasNilExpansion` and the nil branch by `hasNilExpansion`, mutually
exclusive and ORed together.

> **Do not** flatten this to `CATEGORIES.includes(...) || (hasNilExpansion(card) && NIL_CATEGORIES.includes(...))`.
> That drops the `!hasNilExpansion` guard on the regular list, so a nil-expansion card in category
> 3/6/7/8/13/16/19 would newly count as non-collectible. The if/else form is required.

**Already implemented** as a pre-release quickfix — see [Shipped early](#shipped-early-quickfix).

---

## Shipped early (quickfix)

Phase 1 and the collectibility decoupling landed before the release, to fix a live bug: **non-monster
non-collectible cards in the nil expansion required *both* `Include monster cards` and
`Include non-collectible cards` to be visible.** Two independent couplings caused it, which is why it
was hard to locate — fixing either alone left the other blocking.

Done:

- [x] `hasMonsterExpansion` → `hasNilExpansion`,
      `NON_COLLECTIBLE_CATEGORIES_FOR_MONSTER_EXPANSION` → `NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION`
- [x] Added `isMonsterCard = hasMonsterBanner(card) || hasMonsterRarity(card)` to
      [utils/cardHelper.ts](utils/cardHelper.ts) — the banner/rarity-based monster signal that
      replaces expansion 0. Either axis alone is sufficient.
- [x] Merged `isNonCollectibleRegularCard` + `isNonCollectibleMonsterCard` into a single
      `isNonCollectible` using the if/else form above
- [x] **Coupling A** — `passesExpansionFilter` no longer gates *all* nil-expansion cards on the
      monster checkbox, only real monster cards:
      `hasNilExpansion(card) ? !isMonsterCard(card) || shouldIncludeMonsterCards : ...`
- [x] **Coupling B** — dropped the redundant `&& shouldIncludeMonsterCards` double gate from
      `passesCollectibilityFilter`
- [x] `npm run verify` + `npm run build` pass

`hasMonsterRarity` / `hasMonsterBanner` keep their names — those genuinely *are* monster signals;
only `expansion` was the misnomer.

**Still gated on the monster checkbox via escape hatches** (lines for rarity 4 and color 11 in
`isMatchingCard` are unchanged) — phases 2–4 replace those with real checkboxes.

## Phase 2 — Monster banner checkbox

- [ ] [types/filters.ts](types/filters.ts) — add `Monster = 'Monster'` to `BannerFilterOption`
- [ ] [hooks/useSearchFilters/useBannerFilters.ts](hooks/useSearchFilters/useBannerFilters.ts)
  - `defaultBannerFilters`: `[BannerFilterOption.Monster]: false`
  - `bannerIndexMap`: `[BannerFilterOption.Monster]: 11`
- [ ] [../styles/_colors.scss](../styles/_colors.scss) — add `'Monster': $color-banner-11` to
      `$banner-name-to-color-map`. The `$color-banner-11` variable already exists; no new color needed.
- [ ] Verify the generated class `checkbox-label--banner--Monster` picks up the color
      (derived from the filter name in [Checkbox/index.tsx:36-39](components/SearchPanels/shared/FilterGroup/Checkbox/index.tsx#L36-L39)).
      `#300` is very dark — check contrast against the Black banner (`#111`) and adjust
      `$color-banner-11` if the two are hard to tell apart.
- [ ] Optional: give the Monster banner a `SkullIcon` label. Requires passing a new
      `getBannerFilterLabel` to the Banners `FilterGroup` — it currently passes **no**
      `getFilterLabel` ([CardSearchPanel/index.tsx:243-249](components/SearchPanels/CardSearchPanel/index.tsx#L243-L249)).
      Reuse the icon + `filter-icon--monster` class from `getExtraFilterLabel`, which is being
      deleted in phase 3.

### Weekly challenge: always enable the Monster banner

[useAllCardSearchFilters.ts:139-150](hooks/useSearchFilters/useAllCardSearchFilters.ts#L139-L150)
calls `enableBannerFilters(Array.from(filterData.banners))`, which enables only the banners the
challenge lists. Monster must be forced on:

```ts
enableBannerFilters([...Array.from(filterData.banners), BannerFilterOption.Monster])
```

Check `enableFilters` in [useFilterFactory.ts](hooks/useSearchFilters/useFilterFactory.ts) — confirm
it *enables* the listed values (and disables the rest) rather than replacing wholesale in a way that
drops `Select all`/`None` bookkeeping.

## Phase 3 — Monster rarity checkbox

- [ ] [types/filters.ts](types/filters.ts) — add `Monster = 'Monster'` to `RarityFilterOption`
- [ ] [hooks/useSearchFilters/useRarityFilters.ts](hooks/useSearchFilters/useRarityFilters.ts)
  - `defaultFilters`: `[RarityFilterOption.Monster]: false`
    (note existing defaults are **not** all-true: `Uncommon` and `Common` default to `false`)
  - `indexMap`: `[RarityFilterOption.Monster]: 4`
- [ ] Do **not** add `SharedFilterOption` to `Rarity` — the group deliberately has no Select all/none
- [ ] [components/SearchPanels/CardSearchPanel/index.tsx](components/SearchPanels/CardSearchPanel/index.tsx) —
      add a `RarityFilterOption.Monster` case to `getRarityFilterLabel`, which currently `switch`es
      with a `default` that renders **Common**. Without a case, Monster renders as "Common".
      Use `SkullIcon` + `filter-icon--monster`.

## Phase 4 — Remove the extra filter and the escape hatches

- [ ] [types/filters.ts](types/filters.ts) — delete `IncludeMonsterCards` from `ExtraCardFilterOption`
- [ ] [hooks/useSearchFilters/useExtraCardFilters.ts](hooks/useSearchFilters/useExtraCardFilters.ts) —
      delete its `defaultFilters` entry, `valueToStringMap` entry, and the
      `shouldIncludeMonsterCards` derivation + return field
- [ ] [components/SearchPanels/CardSearchPanel/index.tsx](components/SearchPanels/CardSearchPanel/index.tsx) —
      delete the `IncludeMonsterCards` case from `getExtraFilterLabel`
- [ ] [hooks/useSearchFilters/useAllCardSearchFilters.ts](hooks/useSearchFilters/useAllCardSearchFilters.ts) —
      remove `shouldIncludeMonsterCards` from the destructure and from `isMatchingCard`'s dep array,
      and rewrite the filter body:

```ts
// Nil expansion and monster rarity/banner are now ordinary filter dimensions.
// Nil-expansion cards are visible by default; monster visibility is decided by
// the Monster banner and Monster rarity checkboxes.
const passesExpansionFilter = hasNilExpansion(card) || isCardSetIndexSelected(card.expansion)
const passesRarityFilter = isRarityIndexSelected(card.rarity)
const passesBannerFilter = isBannerIndexSelected(card.color)

const passesAnimalCompanionFilter = isAnimalCompanionCard(card)
  ? shouldIncludeAnimalCompanionCards
  : true

const passesCollectibilityFilter = isNonCollectible(card) ? shouldIncludeNonCollectibleCards : true
```

`isRarityIndexSelected(4)` and `isBannerIndexSelected(11)` now resolve against real checkboxes, so
no escape hatch is needed. `hasNilExpansion` short-circuits because expansion 0 has no card-set
checkbox — leave that one in place or nil-expansion cards would be permanently hidden.

- [x] ~~Merge the two `isNonCollectible*` functions~~ — done in the quickfix
- [ ] [utils/cardHelper.ts](utils/cardHelper.ts) — `isMonsterCard` becomes unused by
      `isMatchingCard` once the escape hatches go (banner/rarity are checked directly). Keep it
      anyway: it is the honest definition of a monster card and is worth having for the follow-up
      below. Verify nothing else needs it before considering removal.

## Phase 5 — Consider an "Unset" checkbox in the Card sets group

**Motivation:** the nil expansion was deliberately hidden from the UI to keep the Card sets group
simple, but handling it invisibly has cost more than it saved. It is the direct cause of the
double-gate bug fixed in the quickfix, and even after phases 1–4 it remains the one dimension with
no checkbox — so `passesExpansionFilter` still needs a special case
(`hasNilExpansion(card) || isCardSetIndexSelected(card.expansion)`) purely to keep those cards from
being permanently invisible. Giving nil a checkbox makes all three axes uniform and lets the last
escape hatch go:

```ts
const passesExpansionFilter = isCardSetIndexSelected(card.expansion) // index 0 now mapped
```

### ⚠️ This group is shared with Skilldex, and talents use expansion 0 differently

[useCardSetFilters.ts](hooks/useSearchFilters/useCardSetFilters.ts) is consumed by **both**
`useAllCardSearchFilters` and `useAllTalentSearchFilters`, and `allCardSets` is rendered by both
`CardSearchPanel` and `TalentSearchPanel`. A new option therefore appears in the Skilldex panel too.

Talents **do** use expansion 0, but with an unrelated meaning —
[talentsResponseMapper.ts](utils/talentsResponseMapper.ts) *assigns* it deliberately:

- `expansion: isEventOnlyTalent(talent) ? 0 : talent.expansion` (line 32) — 0 marks **event-only**
  talents
- `isOffer` = `expansion === 0 && name.startsWith('Offer of')`
- `isRootTalent` excludes `expansion === 0` — so labelling it in the UI could imply it is a normal
  card set when the tree logic treats it as a structural marker

So "nil expansion" means *unset* for cards and *event-only* for talents. **Recommendation:** do not
put a shared label on it. Either give the option a card-only label and exclude it from
`TalentSearchPanel`'s `filters` prop, or split the shared hook so each tool names index 0 in its own
terms. Confirm with a Skilldex spot-check either way.

### Checklist

- [ ] Decide the label. `Unset` is accurate; `Other`/`Uncategorized` may read better to players who
      never see raw expansion ids. Avoid "Monster" — that is precisely the conflation being undone.
- [ ] [types/filters.ts](types/filters.ts) — add to `CardSetFilterOption`
- [ ] [hooks/useSearchFilters/useCardSetFilters.ts](hooks/useSearchFilters/useCardSetFilters.ts)
  - `indexMap`: `[...]: [0]` (note this map is `Record<string, number[]>` — arrays, and `Core` already
    maps to `[1, 4]`, so multi-index precedent exists)
  - `indexToValueMap`: `[0]: <the new option>` — without this, `getCardSetNameFromIndex(0)` falls back
    to the `'-'` default passed at `useBaseCardSetFilters(cachedFilters, '-')` and the card set column
    in `ResultCard` shows a dash
  - `defaultCardSetFilterValueMap`: default **off**, to preserve today's behavior for existing users
- [ ] Note the interaction with `Select all`: the card set group *does* have `SharedFilterOption`, so
      `Select all` will tick Unset too (same decision as the Monster banner)
- [ ] Weekly challenge: `enableCardSetFilters(Array.from(filterData.cardSets))` will not enable Unset
      unless forced. Decide whether nil-expansion cards should count toward a weekly challenge —
      likely **no**, in which case leave it alone and document why
- [ ] [hooks/useSearchFilters/useAllCardSearchFilters.ts](hooks/useSearchFilters/useAllCardSearchFilters.ts) —
      drop the `hasNilExpansion` special case from `passesExpansionFilter`
- [ ] `hasNilExpansion` then has no callers in the filter path. It stays needed by `isNonCollectible`
      for the category if/else, so keep it.
- [ ] Verify a nil-expansion card's card set column renders the new name, not `-`

## Cache version bump (applies to phases 2–5)

- [ ] [utils/codexFilterStore.ts](utils/codexFilterStore.ts) — bump `CARDS_CACHE_VERSION` from
      `'v1'` to `'v2'`. One bump covers whichever of these phases ship together; bump again only if
      Phase 5 lands in a *later* release than phases 2–4.

`createFilterHook` guards with `if (key in defaultFilters)`, so a stale cached
`IncludeMonsterCards` key is *dropped* rather than crashing — but the new `Monster` banner and
rarity keys would be absent from old caches and silently fall back to their defaults, giving
returning users a half-migrated filter set. Bumping the version discards cleanly.

Note the talent panel reads the *same* card set filters from a separate cache
(`TALENTS_CACHE_VERSION`, currently `'v3'`). If Phase 5 adds a shared card set option, that key needs
a bump too.

## Verification

Per [../../CLAUDE.md](../../CLAUDE.md), `npm run verify` is required. This touches data hooks, so
also run `npm run build`. No permanent tests — verify in the dev server:

- [ ] Monster banner checkbox renders in the Banners group with a distinguishable dark-red color
- [ ] Monster rarity checkbox renders in the Rarities group and does **not** say "Common"
- [ ] Both default to off on a fresh visit (clear `localStorage` first)
- [ ] Banners `Select all` ticks Monster too
- [ ] Weekly challenge enables the Monster banner even though challenge data omits it
- [ ] Ticking Monster banner shows color-11 cards; unticking hides them
- [ ] Ticking Monster rarity shows rarity-4 cards; unticking hides them
- [ ] **Regression check:** with all monster checkboxes off, Items / Enchantments / Affixes from
      regular expansions are still shown (i.e. the disjoint category lists were not unioned)
- [ ] **Regression check:** `Include non-collectible cards` still behaves as before for both
      regular and nil-expansion non-collectibles
- [ ] Nil-expansion non-monster cards (Monolith, Pacified) appear without needing any monster
      checkbox — this is the intended behavior change
- [ ] **Phase 5 only:** the Unset checkbox appears in Card sets, defaults off, and toggles
      nil-expansion cards; the card set column shows its name rather than `-`
- [ ] **Phase 5 only:** check the Skilldex panel — the new option either behaves sensibly there or is
      excluded from that panel
- [ ] Reload and confirm filters persist under the new cache key

## Follow-up

Once the above lands, revisit whether banner can *drive* `getActualExpansion` and shrink the
hand-maintained lists in [utils/cardsResponseMapper.ts:56-84](utils/cardsResponseMapper.ts#L56-L84).

The decisive data check, against the Blightbane API or the Supabase `Cards` table:

- Cards with `expansion === 0` but `color !== 11` — the "not really a monster card" set
- Cards with `color === 11` but `expansion !== 0` — monster cards the old logic missed
- Whether the known false positives (Monolith, Pacified, Battlespear\*) are color 11

If `color === 11` cleanly separates real monster cards, `getActualExpansion` could reduce to
`if (hasMonsterBanner(card)) return 0`, replacing `ACTUALLY_MONSTER_CARDS` and much of
`ACTUALLY_CORE_CARDS`. If it does not, the lists stay and banner remains a UI-only dimension —
which is fine, since phases 1–4 stand on their own either way.
