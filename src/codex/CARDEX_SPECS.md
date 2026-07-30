# Cardex spec — Fold the nil expansion into Core

Status: **planned, not implemented.**

## Problem

Blightbane's expansion `0` is a nil/unset bucket. Cardex currently has no card-set checkbox for it,
so `passesExpansionFilter` needs a special case to keep those cards from being permanently invisible
([useAllCardSearchFilters.ts:199-204](hooks/useSearchFilters/useAllCardSearchFilters.ts#L199-L204)),
and `ACTUALLY_CORE_CARDS` in [utils/cardsResponseMapper.ts](utils/cardsResponseMapper.ts) hand-moves
a list of nil cards into Core one name at a time.

## Decision

**Nil-expansion cards are shown under the existing `Core` checkbox.**

The rationale is player-facing, not API-facing: *the nil expansion does not exist to the player.*
Every nil-expansion card is always in the game — and so is every Core card (both of its indices).
The player can freely toggle every other expansion per run, but never Core. Nil and Core are
therefore the same category of thing from the player's seat: always on, never a choice. Merging them
is the honest representation.

### Where the remap lives — the Cardex filter hook (option B)

`useCardSetFilters` maps index `0` to Core in the **Cardex path only**. The shared `indexMap` /
`indexToValueMap` in [useCardSetFilters.ts](hooks/useSearchFilters/useCardSetFilters.ts) stay free of
index `0`.

The alternative — remapping `0 → 1` inside `getActualExpansion` — was rejected: it erases
`card.expansion === 0` downstream, which the nil annotation (see below) needs. Option B keeps the raw
value intact without adding a field to `CardData`.

### ⚠️ Index 0 must NOT go into the shared `indexMap`

`useCardSetFilters` is consumed by **both** `useAllCardSearchFilters` and
`useAllTalentSearchFilters`, and talents use expansion 0 with an unrelated meaning —
[talentsResponseMapper.ts:32](utils/talentsResponseMapper.ts#L32) *assigns* it to mark **event-only**
talents (`expansion: isEventOnlyTalent(talent) ? 0 : talent.expansion`). `isOffer` and `isRootTalent`
also key off `expansion === 0` as a structural marker.

Putting `0` in the shared map would break Skilldex at
[TalentTree/index.tsx:97-98](components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx#L97-L98):

```ts
shouldShowCardSet: (index?: number) =>
  shouldShowCardSet && index !== undefined && isCardSetIndexSelected(index),
```

Event talents render a **blank** card set today precisely because `isCardSetIndexSelected(0)` is
`false` — no `indexMap` entry claims index 0. Wire 0 into Core and that flips to `true`, so every
event talent would newly render **"Core"** — factually wrong, and because these labels feed the D3
text-width estimation in [utils/tree/](utils/tree/), it would also change talent node dimensions and
shift tree layout.

## Skilldex must be completely unaffected

This is a hard requirement. Two things protect it, and both must hold:

1. **Filtering** — event talents are already immune *by construction*. `createSectionPredicates` in
   [talentTreeFilter.ts:109-115](hooks/useSearchFilters/talentTreeFilter.ts#L109-L115) only consults
   `isCardSetIndexSelected` in the `regular` section; the `event`, `card`, `offer`, and `unavailable`
   sections never check expansion. That is why deselecting every expansion (Core included) still
   shows all event talents — and it stays true regardless of what index 0 maps to.
2. **Labelling** — guaranteed only by keeping index `0` out of the shared maps, per the warning
   above.

Confirm during verification that no talent in the `regular` section has `expansion === 0`; if one
did, it would newly appear/disappear with the Core checkbox.

## Withdrawn from the previous spec

The earlier version of this spec proposed a Monster banner checkbox, a Monster rarity checkbox, and
an `Unset` card-set checkbox. **All withdrawn.**

- **Monster banner + rarity checkboxes** — premised on the now-fixed expansion-0 conflation. With
  expansion 0 out of the picture, `color === 11` and `rarity === 4` are not independent axes; they
  are two encodings of the same fact, and `isMonsterCard` already ORs them. Two checkboxes would ask
  a question the data doesn't pose ("monsters-by-banner but not by-rarity?") and would produce
  confusing partial results. They would also make monster cards look like a first-class category
  alongside Core/Catalyst/Eclypse, and get swept in by the Banners `Select all` — flooding results
  with enemy abilities. Monster cards are not player-collectible content; one opt-in
  `Include monster cards` extra, sitting beside `Include non-collectible cards` and
  `Include animal companion cards`, states their status correctly.
- **`Unset` card-set checkbox** — its motivation was the double-gate bug (already fixed) plus
  uniformity. This spec achieves the uniformity instead, without exposing a raw API concept to
  players.
- **`Mark expansionless cards as core` extra checkbox** — considered and dropped. Only someone who
  knows expansion 0 exists in the API would ever untick it, and supporting the off state means
  keeping the `passesExpansionFilter` special case permanently plus a second label code path. The
  nil annotation below covers the same debugging need at no interaction cost.
- **`$banner-name-to-color-map` Monster entry** — not needed. `$banner-index-to-color-map` already
  covers color 11 and is what renders result colors.

The banner-driven `getActualExpansion` follow-up is **still open** — see [Follow-up](#follow-up).

## Nil annotation in the card set column

So the nil expansion stays visible at a glance without a checkbox, `ResultCard` renders nil-expansion
cards as `Core**`, with the `**` in its own styled span.

- Cardex-only, at the single JSX site
  [ResultCard/index.tsx:153-157](components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx#L153-L157).
- **Do not** put the marker inside `getCardSetNameFromIndex`'s return value — it would leak into the
  Skilldex SVG node labels and shift tree layout.

```tsx
{shouldShowCardSet && (
  <span className={cx('result-card__card-set')}>
    {getCardSetNameFromIndex(card.expansion) ?? '-'}
    {card.expansion === 0 && <span className={cx('result-card__card-set__nil')}>**</span>}
  </span>
)}
```

`**` reads as a footnote marker to any reader, without exposing a raw API index. The styling is
deliberately a separate span so weight, color and size can be tuned independently of the label —
start subtle and adjust in the dev server.

**Watch the column width.** `&__card-set` at
[ResultCard/index.module.scss:272-285](components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss#L272-L285)
is a fixed `width: 8rem` with `@include text-truncate` and right alignment. `Core (0)` is comfortably
shorter than existing labels like `Metamorphosis` and `Metaprogress`, so truncation is unlikely — but
the `(0)` sits in its own nested span, so confirm it does not wrap to a second line or disturb the
right alignment, on mobile especially (where the font drops to `xxs` but the width stays `8rem`).

## Cache versions — no bumps

Two separate caches are involved. **Neither is bumped.**

**Filter cache** ([utils/codexFilterStore.ts](utils/codexFilterStore.ts)) — the set of filter *keys*
and their defaults are unchanged: `Core` keeps its key and its `true` default; only the
index→selection mapping changes. `createFilterHook` rehydrates by key
(`if (key in defaultFilters)`), so existing caches restore correctly. `CARDS_CACHE_VERSION` stays
`'v1'`, `TALENTS_CACHE_VERSION` stays `'v3'`.

**Card data cache** ([utils/codexCardsStore.ts](utils/codexCardsStore.ts), `'v2'`, 24h TTL) — this
one *is* affected, because `getActualExpansion` runs at map time, not render time. Removing
`ACTUALLY_CORE_CARDS` (task 4) changes the mapped `expansion` for 8 cards, so a returning user's
cached data keeps the old value until it expires or they hit **Resync data**.

Deliberately **not** bumped: the only visible difference during the stale window is that those 8 cards
show plain `Core` instead of `Core°` — a missing footnote marker, not a rendering failure. Not worth
invalidating every user's card cache for. It self-heals within 24 hours.

> Worth knowing while developing: after any change to `getActualExpansion` or `getActualColor`, hit
> **Resync data** or clear `codex_cards_v2` — otherwise you are looking at cards mapped by the old
> code and will misread the result.

---

## Tasks, in order of operation

> **After each numbered task: stop and notify the user.** They will manually verify **both Cardex and
> Skilldex** visually in the dev server before the next task starts, so we catch any drift
> immediately rather than at the end. Do not batch tasks together.
>
> **Docs are part of each task.** If a task changes logic described in
> [CLAUDE.md](../../CLAUDE.md), [src/codex/CLAUDE.md](CLAUDE.md), or any `README.md` (notably
> [utils/eventTreeSpacing/README.md](utils/eventTreeSpacing/README.md)), update those files in the
> same task so the docs never describe stale logic.

### 1. Map index 0 to Core in the Cardex path only — ✅ COMPLETED

- [x] [hooks/useSearchFilters/useCardSetFilters.ts](hooks/useSearchFilters/useCardSetFilters.ts) —
      shared `indexMap` and `indexToValueMap` left unchanged (no index `0`). Added `toCardSetIndex`
      (`0 → 1`) and applied it inside `useCardSetFilters` to both `isIndexSelected` and
      `getValueFromIndex`, each wrapped in `useCallback` to keep the stable references the memoized
      filtering relies on.
- [x] Seam resolved with a **separate export**: `useTalentCardSetFilters` returns the base functions
      unwrapped. Each tool calls its own hook exactly once
      ([useAllCardSearchFilters.ts:60](hooks/useSearchFilters/useAllCardSearchFilters.ts#L60),
      [useAllTalentSearchFilters.ts:40](hooks/useSearchFilters/useAllTalentSearchFilters.ts#L40)) and
      every downstream consumer receives the result as a prop, so no other call sites needed changing.
      `allCardSets` stays shared.
- [x] Confirmed `isCardSetIndexSelected(0)` is still `false` on the Skilldex side.
- [x] Confirmed no talent in the `regular` sections has `expansion === 0`: `isRootTalent`
      ([talentsResponseMapper.ts:241-246](utils/talentsResponseMapper.ts#L241-L246)) excludes
      `expansion !== 0`, and all 11 `ACTUALLY_EVENT_ONLY_TALENTS` have event requirements so they land
      in `eventNodes`.

**Verified:** nil cards appear under Core with a `Core` label; Skilldex event talents still blank and
still visible with every expansion deselected; talent tree unchanged.

### 2. Drop the `passesExpansionFilter` special case — ✅ COMPLETED

- [x] [hooks/useSearchFilters/useAllCardSearchFilters.ts](hooks/useSearchFilters/useAllCardSearchFilters.ts) —
      now plain `const passesExpansionFilter = isCardSetIndexSelected(card.expansion)`.
- [x] Monster rarity/banner branches untouched. The `useCallback` dep array is unchanged —
      `shouldIncludeMonsterCards` is still needed by those two branches.
- [x] Dropped the now-unused `hasNilExpansion` **and** `isMonsterCard` imports.
- [x] `npm run verify` + `npm run build` pass.

**Verified:** unticking Core (or `None`) now hides nil cards; monster cards still hidden with only
Core ticked, now via the rarity/banner gate rather than the deleted nil branch.

> **Note for task 5:** `isMonsterCard` now has **zero callers** — the deleted branch was its only
> consumer. Decide there whether to keep it as documentation or remove it.

### 3. Add the nil annotation — ✅ COMPLETED

- [x] [components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx](components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx) —
      renders a marker in its own span for `card.expansion === 0`. Settled on **`°`** (degree sign)
      after trying `**`.
- [x] [components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss](components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss) —
      nested `&__nil` rule: `font-size('sm')` (`xs` on mobile), bold, `$color-danger-base` at `0.85`
      opacity.
- [x] No wrapping or alignment issues in the 8rem column.

**Verified:** nil cards show `Core°`; regular Core cards show plain `Core`; Skilldex unaffected.

### 4. Remove `ACTUALLY_CORE_CARDS` — ✅ COMPLETED

- [x] [utils/cardsResponseMapper.ts](utils/cardsResponseMapper.ts) — the entire list was nil→Core by
      hand, which `toCardSetIndex` now does. Deleted the list **and** its `getActualExpansion` branch.
      Confirmed against the Blightbane API that these are genuinely nil expansion cards (Monolith and
      Cryo Bomb checked directly), so rewriting them to `1` was actively *hiding* the nil origin that
      the `°` marker exists to surface. Deleting the list is what makes them label correctly.
- [x] `ACTUALLY_MONSTER_CARDS`, `ACTUALLY_ECLYPSE_CARDS` and `ACTUALLY_SYNTHESIS_CARDS` **stay** —
      those move cards between genuinely wrong non-nil expansions.
- [x] Added a note on `getActualExpansion` pointing at `toCardSetIndex` for nil handling.

**Verified:** all 8 names still show under Core, now annotated `Core°` since nothing rewrites their
expansion to 1 anymore. None disappeared.

> ⚠️ **This needed a forced "Resync data" to show up** — the 24h card data cache still held the
> old mapped expansions. See [Cache versions](#cache-versions--no-bumps). **Pacified** additionally
> needs `Include non-collectible cards` ticked (it was added to `NON_COLLECTIBLE_CARDS` separately).

### 4b. Label nil expansion talents as Core too — ✅ COMPLETED

Added mid-sequence after reviewing Skilldex: it is *correct* that event talents, offers and the two
nil unavailable talents are in the nil expansion, so they should say `Core°` like cards do. The only
requirement was that they must **not** disappear when Core is unticked.

- [x] **Shared marker** — `NIL_EXPANSION_MARKER = '°'` in [utils/cardHelper.ts](utils/cardHelper.ts),
      used by both tools. Rendering cannot be shared (Cardex renders an HTML span, Skilldex a D3 SVG
      `<text>`), so Cardex keeps its styled span and Skilldex concatenates the marker into the label
      string in the existing label color.
- [x] **[useCardSetFilters.ts](hooks/useSearchFilters/useCardSetFilters.ts)** — split restructured
      along the axis that actually differs. A private `useSharedCardSetFilters` owns the nil→Core
      **name** remap for both tools; only the **selection** differs (`useCardSetFilters` wraps
      `isIndexSelected`, `useTalentCardSetFilters` does not).
- [x] **[TalentTree/index.tsx](components/ResultsPanels/TalentResultsPanel/TalentTree/index.tsx)** —
      `shouldShowCardSet` no longer consults `isCardSetIndexSelected`. That check was redundant for
      regular talents (unticked-set talents are already filtered out by the `regular` predicate) and
      was the *only* thing blanking the label for the nil sections.
- [x] Removed the now-dead `isCardSetIndexSelected` prop from `TalentTreeProps`, the destructure, the
      layout memo deps (ESLint flagged it as unnecessary), and the parent's JSX + destructure in
      [TalentResultsPanel/index.tsx](components/ResultsPanels/TalentResultsPanel/index.tsx). Bonus:
      toggling card set checkboxes no longer re-runs the talent layout.

**Verified:** event talents, offers and nil unavailable talents show `Core°` and stay visible with
Core unticked; real Core unavailable talents still show plain `Core`; regular talents unchanged.

> **Layout note:** the marker itself costs nothing — the card set row contributes a *fixed*
> `NODE.CARD_SET.HEIGHT` and node width is static
> ([talentNodeDimensions.ts:82-83](utils/talentNodeDimensions.ts#L82-L83)). The tree does shift, but
> because nil-section nodes gained a card set row they previously lacked. The dimension cache key
> includes `card-set-${showCardSet}`, so cached dimensions invalidate correctly.

### 5. Narrow `hasNilExpansion` — ✅ COMPLETED

- [x] [utils/cardHelper.ts](utils/cardHelper.ts) — `hasNilExpansion` is now **private** (no longer
      exported) and moved directly above its single caller, with a comment explaining its narrow role.
      Kept the name rather than renaming to `hasUnsetExpansion`: it is private, adjacent to its only
      use, and consistent with `NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION`.
- [x] `isNonCollectible` if/else structure untouched — see the warning below.
- [x] **Deleted `isMonsterCard`.** It had zero callers after task 2. The spec previously said to keep
      it for the follow-up, but the follow-up needs `hasMonsterBanner` (which exists and is used), so
      it was just dead code. One line to restore if ever needed.
- [x] `hasMonsterBanner` and `hasMonsterRarity` keep their names and behavior — still used by
      `isMatchingCard`'s rarity and banner branches.

**Verification focus:** no behavior change. Spot-check that non-collectible filtering is identical in
Cardex.

### 6. Final verification and docs sweep

- [ ] `npm run verify` (required per [CLAUDE.md](../../CLAUDE.md)) — format:check, lint, type-check,
      test.
- [ ] `npm run build` — this touches data hooks.
- [ ] Re-read [CLAUDE.md](../../CLAUDE.md) and [src/codex/CLAUDE.md](CLAUDE.md) end to end and confirm
      nothing describes the old nil-expansion handling. Update if it does.
- [ ] Delete any temporary test files written along the way (repo policy: no permanent tests).
- [ ] Walk the full checklist below.

---

## ⚠️ Do not touch: the disjoint category lists in `isNonCollectible`

`NON_COLLECTIBLE_CATEGORIES` and `NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION` overlap in several
categories (6, 7, 8, 13, 19) but the nil list additionally contains 1 (Items), 4 (Enchantments),
12 (Affixes) and others that are non-collectible *only* in nil expansion. Unioning the lists would
mark **every Item and Enchantment in the game** non-collectible — a large, visible regression.

The if/else form in [utils/cardHelper.ts](utils/cardHelper.ts) is required:

```ts
export const isNonCollectible = (card: CardData) =>
  NON_COLLECTIBLE_CARDS.some((cardName) => cardName.toLowerCase() === card.name.toLowerCase()) ||
  (hasNilExpansion(card)
    ? NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION.includes(card.category)
    : NON_COLLECTIBLE_CATEGORIES.includes(card.category))
```

> **Do not** flatten to `CATEGORIES.includes(...) || (hasNilExpansion(card) && NIL_CATEGORIES.includes(...))`.
> That drops the implicit `!hasNilExpansion` guard on the regular list, so a nil-expansion card in a
> shared category would change classification.

Note this is the one place that still needs the raw `expansion === 0` test — task 5 renames the
helper but must keep the structure.

## Verification checklist

Per [../../CLAUDE.md](../../CLAUDE.md), `npm run verify` is required; this touches data hooks so also
run `npm run build`. No permanent tests — verify in the dev server.

**Cardex:**

- [ ] Nil-expansion non-monster cards (Monolith, Pacified) show under Core, annotated `Core (0)`
- [ ] Unticking Core hides them; ticking Core shows them
- [ ] `Select all` / `None` in Card sets behave sensibly with nil cards
- [ ] The card set column never shows `-` for a card that has a real expansion
- [ ] `Core (0)` renders on one line, right-aligned like other labels — desktop and mobile
- [ ] `Include monster cards` still gates monster cards (banner 11 / rarity 4), default off
- [ ] **Regression:** with monster cards off, Items / Enchantments / Affixes from regular expansions
      are still shown (disjoint category lists not unioned)
- [ ] **Regression:** `Include non-collectible cards` behaves as before for both nil and regular
      non-collectibles
- [ ] Weekly challenge still sets card set + banner filters correctly
- [ ] Reload and confirm cached filters restore correctly on the existing `v1` key

**Skilldex — must be byte-for-byte unchanged in behavior:**

- [ ] Event talents show a **blank** card set, not `Core`, not `Core (0)`
- [ ] Deselecting **every** expansion including Core still shows all event talents
- [ ] Offers and unavailable talents unaffected
- [ ] Talent tree layout is visually identical — no node width or spacing shift at any zoom level
- [ ] Regular talents still filter by expansion exactly as before
- [ ] No talent in the `regular` section turns out to have `expansion === 0`

## Follow-up

Revisit whether banner can *drive* `getActualExpansion` and shrink the hand-maintained lists in
[utils/cardsResponseMapper.ts:58-86](utils/cardsResponseMapper.ts#L58-L86). Task 4 already trims
`ACTUALLY_CORE_CARDS`; this would go further.

The decisive data check, against the Blightbane API or the Supabase `Cards` table:

- Cards with `expansion === 0` but `color !== 11` — the "not really a monster card" set
- Cards with `color === 11` but `expansion !== 0` — monster cards the old logic missed
- Whether the known false positives (Monolith, Pacified, Battlespear\*) are color 11

If `color === 11` cleanly separates real monster cards, `getActualExpansion` could reduce to
`if (hasMonsterBanner(card)) return 0`, replacing `ACTUALLY_MONSTER_CARDS` and much of what remains of
`ACTUALLY_CORE_CARDS`. If it does not, the lists stay and banner remains a UI-only dimension — which
is fine, since the tasks above stand on their own either way.
