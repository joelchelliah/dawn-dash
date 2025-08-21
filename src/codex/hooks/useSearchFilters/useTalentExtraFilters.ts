import {
  TalentExtraFilterOption,
  TalentExtra,
  TalentCodexSearchFilterCache,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultTalentExtraFilters = {
  [TalentExtraFilterOption.IncludeOffers]: false,
  [TalentExtraFilterOption.IncludeEventBasedTalents]: false,
}

const talentExtraToStringMap = {
  [TalentExtraFilterOption.IncludeOffers]: 'Include offers',
  [TalentExtraFilterOption.IncludeEventBasedTalents]: 'Include event-based talents',
}

export const allTalentExtraFilters = TalentExtra.getAll()

const useBaseTalentExtraFilters = createFilterHook({
  defaultFilters: defaultTalentExtraFilters,
  allValues: allTalentExtraFilters,
  valueToStringMap: talentExtraToStringMap,
})

export const useTalentExtraFilters = (cachedFilters?: TalentCodexSearchFilterCache['extras']) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseTalentExtraFilters(cachedFilters)
  const shouldIncludeOffers = filters[TalentExtraFilterOption.IncludeOffers]
  const shouldIncludeEventBasedTalents = filters[TalentExtraFilterOption.IncludeEventBasedTalents]

  return {
    talentExtraFilters: filters,
    handleTalentExtraFilterToggle: handleFilterToggle,
    getTalentExtraFilterName: getValueToString,
    resetTalentExtraFilters: resetFilters,
    shouldIncludeOffers,
    shouldIncludeEventBasedTalents,
  }
}
