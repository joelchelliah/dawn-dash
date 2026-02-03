import { ExtraCardFilterOption, ExtraCard, CardCodexSearchFilterCache } from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [ExtraCardFilterOption.IncludeMonsterCards]: false,
  [ExtraCardFilterOption.IncludeAnimalCompanionCards]: true,
  [ExtraCardFilterOption.IncludeNonCollectibleCards]: false,
}

const valueToStringMap = {
  [ExtraCardFilterOption.IncludeMonsterCards]: 'Include monster cards',
  [ExtraCardFilterOption.IncludeAnimalCompanionCards]: 'Include animal companion cards',
  [ExtraCardFilterOption.IncludeNonCollectibleCards]: 'Include non-collectible cards',
}

export const allExtraCardFilters = ExtraCard.getAll()

const useBaseFilters = createFilterHook({
  defaultFilters,
  allValues: allExtraCardFilters,
  valueToStringMap,
})

export const useExtraCardFilters = (cachedFilters?: CardCodexSearchFilterCache['extras']) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseFilters(cachedFilters)
  const shouldIncludeMonsterCards = filters[ExtraCardFilterOption.IncludeMonsterCards]
  const shouldIncludeAnimalCompanionCards =
    filters[ExtraCardFilterOption.IncludeAnimalCompanionCards]
  const shouldIncludeNonCollectibleCards = filters[ExtraCardFilterOption.IncludeNonCollectibleCards]

  return {
    extraCardFilters: filters,
    handleExtraCardFilterToggle: handleFilterToggle,
    getExtraCardFilterName: getValueToString,
    resetExtraCardFilters: resetFilters,
    shouldIncludeMonsterCards,
    shouldIncludeAnimalCompanionCards,
    shouldIncludeNonCollectibleCards,
  }
}
