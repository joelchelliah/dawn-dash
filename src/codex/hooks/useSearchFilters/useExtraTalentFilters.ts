import {
  ExtraTalentFilterOption,
  ExtraTalent,
  TalentCodexSearchFilterCache,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [ExtraTalentFilterOption.IncludeOffers]: false,
  [ExtraTalentFilterOption.IncludeEventBasedTalents]: false,
}

const valueToStringMap = {
  [ExtraTalentFilterOption.IncludeOffers]: 'Include offers',
  [ExtraTalentFilterOption.IncludeEventBasedTalents]: 'Include event-based talents',
}

export const allExtraTalentFilters = ExtraTalent.getAll()

const useBaseFilters = createFilterHook({
  defaultFilters,
  allValues: allExtraTalentFilters,
  valueToStringMap,
})

export const useExtraTalentFilters = (cachedFilters?: TalentCodexSearchFilterCache['extras']) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseFilters(cachedFilters)
  const shouldIncludeOffers = filters[ExtraTalentFilterOption.IncludeOffers]
  const shouldIncludeEventBasedTalents = filters[ExtraTalentFilterOption.IncludeEventBasedTalents]

  return {
    extraTalentFilters: filters,
    handleExtraTalentFilterToggle: handleFilterToggle,
    getExtraTalentFilterName: getValueToString,
    resetExtraTalentFilters: resetFilters,
    shouldIncludeOffers,
    shouldIncludeEventBasedTalents,
  }
}
