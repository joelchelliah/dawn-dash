import { Banner, BannerFilterOption, SharedFilterOption } from '../types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultBannerFilters: Record<string, boolean> = {
  [BannerFilterOption.Green]: true,
  [BannerFilterOption.Blue]: true,
  [BannerFilterOption.Red]: true,
  [BannerFilterOption.Purple]: true,
  [BannerFilterOption.Brown]: true,
  [BannerFilterOption.Aqua]: true,
  [BannerFilterOption.Gold]: true,
  [BannerFilterOption.Black]: true,
  [BannerFilterOption.Orange]: true,
  [SharedFilterOption.All]: false,
  [SharedFilterOption.None]: false,
}

const bannerIndexMap: Record<string, number> = {
  [BannerFilterOption.Green]: 1,
  [BannerFilterOption.Blue]: 2,
  [BannerFilterOption.Red]: 3,
  [BannerFilterOption.Purple]: 4,
  [BannerFilterOption.Brown]: 5,
  [BannerFilterOption.Aqua]: 6,
  // Skipping 7 (unused)
  [BannerFilterOption.Gold]: 8,
  [BannerFilterOption.Black]: 9,
  [BannerFilterOption.Orange]: 10,
}

export const allBanners: string[] = Banner.getAll()

const useBaseBannerFilters = createFilterHook({
  defaultFilters: defaultBannerFilters,
  allValues: allBanners,
  indexMap: bannerIndexMap,
})

export const useBannerFilters = () => {
  const { filters, isIndexSelected, handleFilterToggle, resetFilters } = useBaseBannerFilters()

  return {
    bannerFilters: filters,
    isBannerIndexSelected: isIndexSelected,
    handleBannerFilterToggle: handleFilterToggle,
    resetBannerFilters: resetFilters,
  }
}
