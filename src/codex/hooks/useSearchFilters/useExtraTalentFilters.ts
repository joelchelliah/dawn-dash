import {
  ExtraTalentFilterOption,
  ExtraTalent,
  TalentCodexSearchFilterCache,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [ExtraTalentFilterOption.IncludeOffers]: false,
  [ExtraTalentFilterOption.IncludeEvents]: false,
}

const valueToStringMap = {
  [ExtraTalentFilterOption.IncludeOffers]: 'Include offers',
  [ExtraTalentFilterOption.IncludeEvents]: 'Include events',
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
  const shouldIncludeEvents = filters[ExtraTalentFilterOption.IncludeEvents]

  return {
    extraTalentFilters: filters,
    handleExtraTalentFilterToggle: handleFilterToggle,
    getExtraTalentFilterName: getValueToString,
    resetExtraTalentFilters: resetFilters,
    shouldIncludeOffers,
    shouldIncludeEvents,
  }
}
