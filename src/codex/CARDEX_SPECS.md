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
cards as `Core (0)`, with the `(0)` in a smaller font.

- Cardex-only, at the single JSX site
  [ResultCard/index.tsx:153-157](components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx#L153-L157).
- **Do not** put `(0)` inside `getCardSetNameFromIndex`'s return value — it would leak into the
  Skilldex SVG node labels and shift tree layout.

```tsx
{shouldShowCardSet && (
  <span className={cx('result-card__card-set')}>
    {getCardSetNameFromIndex(card.expansion) ?? '-'}
    {card.expansion === 0 && <span className={cx('result-card__card-set__nil')}>(0)</span>}
  </span>
)}
```

`(0)` is a raw API index with no in-game meaning, so it reads as a debugging affordance rather than
player information. Alternatives at the same clutter cost, if it looks wrong in place: `Core *`
(reads as "footnote" to anyone) or `Core (unset)` (self-describing but longest).

**Watch the column width.** `&__card-set` at
[ResultCard/index.module.scss:272-285](components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss#L272-L285)
is a fixed `width: 8rem` with `@include text-truncate` and right alignment. `Core (0)` is comfortably
shorter than existing labels like `Metamorphosis` and `Metaprogress`, so truncation is unlikely — but
the `(0)` sits in its own nested span, so confirm it does not wrap to a second line or disturb the
right alignment, on mobile especially (where the font drops to `xxs` but the width stays `8rem`).

## Cache version

**No bump needed.** The set of filter *keys* and their defaults are unchanged — `Core` keeps its key
and its `true` default; only the index→selection mapping changes. `createFilterHook` rehydrates by
key (`if (key in defaultFilters)`), so existing caches restore correctly.

`CARDS_CACHE_VERSION` stays `'v1'` and `TALENTS_CACHE_VERSION` stays `'v3'`
([utils/codexFilterStore.ts:9,20](utils/codexFilterStore.ts#L9-L20)).

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

### 1. Map index 0 to Core in the Cardex path only

- [ ] [hooks/useSearchFilters/useCardSetFilters.ts](hooks/useSearchFilters/useCardSetFilters.ts) —
      leave the shared `indexMap` and `indexToValueMap` **unchanged** (no index `0`). Add the nil→Core
      remap in the `useCardSetFilters` wrapper so it applies to Cardex but not to the talent path:
      wrap `isIndexSelected` as `(index) => isIndexSelected(index === 0 ? 1 : index)` and wrap
      `getValueFromIndex` the same way.
- [ ] Check how `useAllTalentSearchFilters` and `TalentResultsPanel` obtain these functions — both
      currently call `useCardSetFilters`. If they share the same wrapper, the wrapped versions must
      **not** be the ones handed to the talent path; expose the unwrapped functions for talents (a
      separate export, or an argument to the hook). Getting this seam right is the whole task.
- [ ] Verify `isCardSetIndexSelected(0)` is still `false` on the Skilldex side.

**Verification focus:** Cardex — nil cards (Monolith, Pacified) appear under Core and disappear when
Core is unticked. Skilldex — event talents still show a blank card set, and still all appear with
every expansion deselected.

### 2. Drop the `passesExpansionFilter` special case

- [ ] [hooks/useSearchFilters/useAllCardSearchFilters.ts](hooks/useSearchFilters/useAllCardSearchFilters.ts) —
      replace the `hasNilExpansion(card) ? … : …` branch with plain
      `const passesExpansionFilter = isCardSetIndexSelected(card.expansion)`.
- [ ] Leave the monster rarity/banner branches exactly as they are — they are gated on the
      `Include monster cards` extra and stay that way.
- [ ] Remove `hasNilExpansion` from the import if it is no longer used in this file.

**Verification focus:** with `Include monster cards` off, nil-expansion monster cards stay hidden
(they now fail the rarity/banner check rather than the expansion check). Non-collectible behavior
unchanged for both nil and regular cards.

### 3. Add the `Core (0)` annotation

- [ ] [components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx](components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx) —
      render the smaller-font `(0)` suffix for `card.expansion === 0`, per the snippet above.
- [ ] [components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss](components/ResultsPanels/CardResultsPanel/ResultCard/index.module.scss) —
      add the nested `&__nil` rule (smaller `font-size`, likely muted color).
- [ ] Confirm the nested span does not wrap or break right alignment in the 8rem column, desktop and
      mobile. Width itself is not a concern — `Metamorphosis` is already longer.

**Verification focus:** this is the one purely visual task — compare before/after in the dev server
and decide whether `(0)` looks right or one of the alternatives reads better. Skilldex node labels
must be pixel-identical (no `(0)` anywhere, no layout shift).

### 4. Audit `ACTUALLY_CORE_CARDS`

- [ ] [utils/cardsResponseMapper.ts](utils/cardsResponseMapper.ts) — for each name in
      `ACTUALLY_CORE_CARDS`, check its raw API expansion. Entries that are raw `0` existed only to
      move nil→Core by hand and are now redundant: **remove them**. Entries in a genuinely wrong
      *non-nil* expansion must **stay**.
- [ ] Removing an entry changes what the column shows: it becomes `Core (0)` instead of plain `Core`.
      That is intended and is the point of the annotation — confirm it looks correct.
- [ ] If the list empties completely, drop the list and its `getActualExpansion` branch.

**Verification focus:** every name previously in the list still shows under Core in Cardex — some now
annotated `(0)`. None disappear.

### 5. Narrow `hasNilExpansion`

- [ ] [utils/cardHelper.ts](utils/cardHelper.ts) — after task 2, `hasNilExpansion` has no callers in
      the filter path; its only remaining use is the category if/else inside `isNonCollectible`, where
      it means "raw expansion 0". Rename it to say that (e.g. `hasUnsetExpansion`) and stop exporting
      it if nothing outside the file needs it.
- [ ] Do **not** touch the `isNonCollectible` if/else structure — see the warning below.
- [ ] `isMonsterCard`, `hasMonsterBanner`, `hasMonsterRarity` keep their names and behavior.

**Verification focus:** pure rename, no behavior change. Spot-check that non-collectible filtering is
identical in Cardex.

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

The if/else form in [utils/cardHelper.ts:113-117](utils/cardHelper.ts#L113-L117) is required:

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
