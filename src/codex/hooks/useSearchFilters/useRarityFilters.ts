import {
  CardCodexSearchFilterCache,
  Rarity,
  RarityFilterOption,
  SharedFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters: Record<string, boolean> = {
  [RarityFilterOption.Legendary]: true,
  [RarityFilterOption.Rare]: true,
  [RarityFilterOption.Uncommon]: false,
  [RarityFilterOption.Common]: false,
  [SharedFilterOption.All]: false,
  [SharedFilterOption.None]: false,
}

const indexMap: Record<string, number> = {
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
  const { filters, isIndexSelected, handleFilterToggle, enableFilters, resetFilters } =
    useBaseRarityFilters(cachedFilters)

  return {
    rarityFilters: filters,
    isRarityIndexSelected: isIndexSelected,
    handleRarityFilterToggle: handleFilterToggle,
    enableRarityFilters: enableFilters,
    resetRarityFilters: resetFilters,
  }
}
