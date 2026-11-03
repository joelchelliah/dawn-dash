import { SharedFilterOption } from '@/shared/types/filters'
import { createFilterUrlCodec } from '@/shared/utils/filterUrlCodec'
import { getCardTypeEmoji, getCardTypeName } from '@/shared/utils/cardTypes'
import { createFilterHook } from '@/shared/hooks/useSearchFilters/useFilterFactory'

import { CardSearchFilterCache, CardType, CardTypeFilterOption } from '@/cardex/types/cardFilters'

const defaultFilters: Record<string, boolean> = {
  [CardTypeFilterOption.Melee]: true,
  [CardTypeFilterOption.Magic]: true,
  [CardTypeFilterOption.Ranged]: true,
  [CardTypeFilterOption.Utility]: true,
  [CardTypeFilterOption.Divine]: true,
  [CardTypeFilterOption.Corruption]: true,
  [SharedFilterOption.All]: true,
  [SharedFilterOption.None]: false,
}

const indexMap: Record<string, number> = {
  [CardTypeFilterOption.Melee]: 0,
  [CardTypeFilterOption.Magic]: 1,
  [CardTypeFilterOption.Ranged]: 2,
  [CardTypeFilterOption.Utility]: 3,
  [CardTypeFilterOption.Divine]: 4,
  // Skipping 5 (Move) — never used in the game
  [CardTypeFilterOption.Corruption]: 6,
  // Skipping 7 (Monster) — Weird set of cards... Ignored. Monster cards are already handled by the "Include Monster cards" checkbox.
  // Its name and emoji still come from `@/shared/utils/cardTypes`, so those cards render a label.
}

/*
 * The checkboxes are keyed by filter name, the result cards by type index, so the emoji is reachable
 * both ways. Unmapped keys give '' — which is what keeps `Select all`/`Select none` emoji-free.
 */
const valueToEmojiMap: Record<string, string> = Object.fromEntries(
  Object.entries(indexMap).map(([value, index]) => [value, getCardTypeEmoji(index)])
)

export const getCardTypeEmojiFromName = (filter: string): string => valueToEmojiMap[filter] ?? ''

export const allCardTypes: CardType[] = CardType.getAll()

export const cardTypeUrlCodec = createFilterUrlCodec('types', indexMap)

const useBaseCardTypeFilters = createFilterHook({
  defaultFilters,
  allValues: allCardTypes,
  indexMap,
})

export const useCardTypeFilters = (cachedFilters?: CardSearchFilterCache['cardTypes']) => {
  const { filters, isIndexSelected, handleFilterToggle, enableFilters, resetFilters } =
    useBaseCardTypeFilters(cachedFilters)

  return {
    cardTypeFilters: filters,
    isCardTypeIndexSelected: isIndexSelected,
    getCardTypeNameFromIndex: getCardTypeName,
    getCardTypeEmojiFromIndex: getCardTypeEmoji,
    handleCardTypeFilterToggle: handleFilterToggle,
    enableCardTypeFilters: enableFilters,
    resetCardTypeFilters: resetFilters,
  }
}
