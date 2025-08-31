import { CardCodexSearchFilterCache, Rarity, RarityFilterOption } from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [RarityFilterOption.Legendary]: true,
  [RarityFilterOption.Rare]: true,
  [RarityFilterOption.Uncommon]: false,
  [RarityFilterOption.Common]: false,
}

const indexMap = {
  [RarityFilterOption.Legendary]: 3,
  [RarityFilterOption.Rare]: 2,
  [RarityFilterOption.Uncommon]: 1,
  [RarityFilterOption.Common]: 0,
}

export const allRarities: Rarity[] = Rarity.getAll()

const useBaseRarityFilters = createFilterHook({
  defaultFilters,
  allValues: allRarities,
  indexMap,
})

export const useRarityFilters = (cachedFilters?: CardCodexSearchFilterCache['rarities']) => {
  const { filters, isIndexSelected, handleFilterToggle, resetFilters } =
    useBaseRarityFilters(cachedFilters)

  return {
    rarityFilters: filters,
    isRarityIndexSelected: isIndexSelected,
    handleRarityFilterToggle: handleFilterToggle,
    resetRarityFilters: resetFilters,
  }
}
