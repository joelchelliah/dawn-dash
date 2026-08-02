import { ExtraCardFilterOption, ExtraCard, CardCodexSearchFilterCache } from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [ExtraCardFilterOption.IncludeMonsterCards]: false,
  [ExtraCardFilterOption.IncludeAnimalCompanionCards]: true,
  [ExtraCardFilterOption.IncludeNonCollectibleCards]: false,
}

const valueToStringMap = {
  [ExtraCardFilterOption.IncludeMonsterCards]: 'Include Monster cards',
  [ExtraCardFilterOption.IncludeAnimalCompanionCards]: 'Include Animal Companion cards',
  [ExtraCardFilterOption.IncludeNonCollectibleCards]: 'Include Non-collectible cards',
}

export const allExtraCardFilters = ExtraCard.getAll()

const useBaseFilters = createFilterHook({
  defaultFilters,
  allValues: allExtraCardFilters,
  valueToStringMap,
})

export const useExtraCardFilters = (cachedFilters?: CardCodexSearchFilterCache['extras']) => {
  const { filters, handleFilterToggle, getValueToString, enableFilters, resetFilters } =
    useBaseFilters(cachedFilters)
  const shouldIncludeMonsterCards = filters[ExtraCardFilterOption.IncludeMonsterCards]
  const shouldIncludeAnimalCompanionCards =
    filters[ExtraCardFilterOption.IncludeAnimalCompanionCards]
  const shouldIncludeNonCollectibleCards = filters[ExtraCardFilterOption.IncludeNonCollectibleCards]

  return {
    extraCardFilters: filters,
    handleExtraCardFilterToggle: handleFilterToggle,
    getExtraCardFilterName: getValueToString,
    enableExtraCardFilters: enableFilters,
    resetExtraCardFilters: resetFilters,
    shouldIncludeMonsterCards,
    shouldIncludeAnimalCompanionCards,
    shouldIncludeNonCollectibleCards,
  }
}
