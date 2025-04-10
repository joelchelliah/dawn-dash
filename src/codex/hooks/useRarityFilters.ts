import { Rarity, RarityFilterOption } from '../types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultRarityFilters = {
  [RarityFilterOption.Legendary]: true,
  [RarityFilterOption.Rare]: true,
  [RarityFilterOption.Uncommon]: false,
  [RarityFilterOption.Common]: false,
}

const rarityIndexMap = {
  [RarityFilterOption.Common]: 0,
  [RarityFilterOption.Uncommon]: 1,
  [RarityFilterOption.Rare]: 2,
  [RarityFilterOption.Legendary]: 3,
}

export const allRarities: Rarity[] = Rarity.getAll()

const useBaseRarityFilters = createFilterHook({
  defaultFilters: defaultRarityFilters,
  allValues: allRarities,
  indexMap: rarityIndexMap,
})

export const useRarityFilters = () => {
  const { filters, isIndexSelected, handleFilterToggle, resetFilters } = useBaseRarityFilters()

  return {
    rarityFilters: filters,
    isRarityIndexSelected: isIndexSelected,
    handleRarityFilterToggle: handleFilterToggle,
    resetRarityFilters: resetFilters,
  }
}
