import {
  CardCodexSearchFilterCache,
  CardSet,
  CardSetFilterOption,
  SharedFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultCardSetFilterValueMap: Record<string, boolean> = {
  [CardSetFilterOption.Core]: true,
  [CardSetFilterOption.Metaprogress]: true,
  [CardSetFilterOption.Metamorphosis]: true,
  [CardSetFilterOption.Infinitum]: true,
  [CardSetFilterOption.Catalyst]: true,
  [CardSetFilterOption.Eclypse]: true,
  [SharedFilterOption.All]: true,
  [SharedFilterOption.None]: false,
}

const cardSetIndicesMap: Record<string, number[]> = {
  [CardSetFilterOption.Core]: [1, 4],
  [CardSetFilterOption.Metaprogress]: [2],
  [CardSetFilterOption.Metamorphosis]: [3],
  [CardSetFilterOption.Infinitum]: [5],
  [CardSetFilterOption.Catalyst]: [6],
  [CardSetFilterOption.Eclypse]: [7],
}

const indexToCardSetMap: Record<number, string> = {
  [1]: CardSetFilterOption.Core,
  [2]: CardSetFilterOption.Metaprogress,
  [3]: CardSetFilterOption.Metamorphosis,
  [4]: CardSetFilterOption.Core,
  [5]: CardSetFilterOption.Infinitum,
  [6]: CardSetFilterOption.Catalyst,
  [7]: CardSetFilterOption.Eclypse,
}

export const allCardSets: string[] = CardSet.getAll()

const useBaseCardSetFilters = createFilterHook({
  defaultFilters: defaultCardSetFilterValueMap,
  allValues: allCardSets,
  indexMap: cardSetIndicesMap,
  indexToValueMap: indexToCardSetMap,
})

export const useCardSetFilters = (cachedFilters?: CardCodexSearchFilterCache['cardSets']) => {
  const {
    filters,
    isIndexSelected,
    getValueFromIndex,
    handleFilterToggle,
    enableFilters,
    resetFilters,
  } = useBaseCardSetFilters(cachedFilters, '__')
  return {
    cardSetFilters: filters,
    isCardSetIndexSelected: isIndexSelected,
    getCardSetNameFromIndex: getValueFromIndex,
    handleCardSetFilterToggle: handleFilterToggle,
    enableCardSetFilters: enableFilters,
    resetCardSetFilters: resetFilters,
  }
}
