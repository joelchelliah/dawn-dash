import {
  CardCodexSearchFilterCache,
  CardSet,
  CardSetFilterOption,
  SharedFilterOption,
} from '../../types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultCardSetFilterValueMap: Record<string, boolean> = {
  [CardSetFilterOption.Core]: true,
  [CardSetFilterOption.Metaprogress]: false,
  [CardSetFilterOption.Metamorphosis]: false,
  [CardSetFilterOption.Infinitum]: false,
  [CardSetFilterOption.Catalyst]: false,
  [CardSetFilterOption.Eclypse]: false,
  [SharedFilterOption.All]: false,
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
