import { ExtraFilterOption, Extra, CardCodexSearchFilterCache } from '../types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultExtraFilters = {
  [ExtraFilterOption.IncludeMonsterCards]: false,
  [ExtraFilterOption.IncludeNonCollectibleCards]: false,
}

const extraToStringMap = {
  [ExtraFilterOption.IncludeMonsterCards]: 'Include monster cards',
  [ExtraFilterOption.IncludeNonCollectibleCards]: 'Include non-collectible cards',
}

export const allExtraFilters = Extra.getAll()

const useBaseExtraFilters = createFilterHook({
  defaultFilters: defaultExtraFilters,
  allValues: allExtraFilters,
  valueToStringMap: extraToStringMap,
})

export const useExtraFilters = (cachedFilters?: CardCodexSearchFilterCache['extras']) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseExtraFilters(cachedFilters)
  const shouldIncludeMonsterCards = filters[ExtraFilterOption.IncludeMonsterCards]
  const shouldIncludeNonCollectibleCards = filters[ExtraFilterOption.IncludeNonCollectibleCards]

  return {
    extraFilters: filters,
    handleExtraFilterToggle: handleFilterToggle,
    getExtraFilterName: getValueToString,
    resetExtraFilters: resetFilters,
    shouldIncludeMonsterCards,
    shouldIncludeNonCollectibleCards,
  }
}
