import { useCallback } from 'react'

import {
  CardCodexSearchFilterCache,
  CardType,
  CardTypeFilterOption,
  SharedFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

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
}

const indexToValueMap: Record<number, string> = {
  ...Object.fromEntries(Object.entries(indexMap).map(([value, index]) => [index, value])),
  7: 'Monster',
}

const indexToEmojiMap: Record<number, string> = {
  0: '⚔️',
  1: '🔮',
  2: '🏹',
  3: '🛠️',
  4: '☀️',
  6: '🌙',
  7: '👹',
}

/*
 * The checkboxes are keyed by filter name, the result cards by type index, so the emoji is reachable
 * both ways. Unmapped keys give '' — which is what keeps `Select all`/`Select none` emoji-free.
 */
const valueToEmojiMap: Record<string, string> = Object.fromEntries(
  Object.entries(indexMap).map(([value, index]) => [value, indexToEmojiMap[index] ?? ''])
)

export const getCardTypeEmojiFromName = (filter: string): string => valueToEmojiMap[filter] ?? ''

export const allCardTypes: CardType[] = CardType.getAll()

const useBaseCardTypeFilters = createFilterHook({
  defaultFilters,
  allValues: allCardTypes,
  indexMap,
  indexToValueMap,
})

export const useCardTypeFilters = (cachedFilters?: CardCodexSearchFilterCache['cardTypes']) => {
  const {
    filters,
    isIndexSelected,
    getValueFromIndex,
    handleFilterToggle,
    enableFilters,
    resetFilters,
  } = useBaseCardTypeFilters(cachedFilters)

  // Stable reference, like the factory's own getters, so `ResultCard` stays memoizable
  const getCardTypeEmojiFromIndex = useCallback((index: number) => indexToEmojiMap[index] ?? '', [])

  return {
    cardTypeFilters: filters,
    isCardTypeIndexSelected: isIndexSelected,
    getCardTypeNameFromIndex: getValueFromIndex,
    getCardTypeEmojiFromIndex,
    handleCardTypeFilterToggle: handleFilterToggle,
    enableCardTypeFilters: enableFilters,
    resetCardTypeFilters: resetFilters,
  }
}
