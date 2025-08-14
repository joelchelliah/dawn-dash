import {
  SharedFilterOption,
  TalentCodexSearchFilterCache,
  Tier,
  TierFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultTierFilters = {
  [TierFilterOption.Tier0]: true,
  [TierFilterOption.Tier1]: true,
  [TierFilterOption.Tier2]: true,
  [TierFilterOption.Tier3]: true,
  [TierFilterOption.Tier4]: true,
  [TierFilterOption.Tier5]: true,
  [TierFilterOption.Tier6]: true,
  [SharedFilterOption.All]: true,
  [SharedFilterOption.None]: false,
}

const tierIndexMap = {
  [TierFilterOption.Tier0]: 0,
  [TierFilterOption.Tier1]: 1,
  [TierFilterOption.Tier2]: 2,
  [TierFilterOption.Tier3]: 3,
  [TierFilterOption.Tier4]: 4,
  [TierFilterOption.Tier5]: 5,
  [TierFilterOption.Tier6]: 6,
}

export const allTiers: Tier[] = Tier.getAll()

const useBaseTierFilters = createFilterHook({
  defaultFilters: defaultTierFilters,
  allValues: allTiers,
  indexMap: tierIndexMap,
})

export const useTierFilters = (cachedFilters?: TalentCodexSearchFilterCache['tiers']) => {
  const { filters, isIndexSelected, handleFilterToggle, resetFilters } =
    useBaseTierFilters(cachedFilters)

  return {
    tierFilters: filters,
    isTierIndexSelected: isIndexSelected,
    handleTierFilterToggle: handleFilterToggle,
    resetTierFilters: resetFilters,
  }
}
