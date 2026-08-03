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
  // Skipping 7 (Monster) — covered by the "Include Monster cards" checkbox
}

/*
 * Index 7 (Monster) has no checkbox but still needs a display name,
 * since monster cards do show up in the results.
 */
const indexToValueMap: Record<number, string> = {
  ...Object.fromEntries(Object.entries(indexMap).map(([value, index]) => [index, value])),
  7: 'Monster',
}

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

  return {
    cardTypeFilters: filters,
    isCardTypeIndexSelected: isIndexSelected,
    getCardTypeNameFromIndex: getValueFromIndex,
    handleCardTypeFilterToggle: handleFilterToggle,
    enableCardTypeFilters: enableFilters,
    resetCardTypeFilters: resetFilters,
  }
}
