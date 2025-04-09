import { useState } from 'react'

enum Banner {
  Green = 'Green',
  Blue = 'Blue',
  Red = 'Red',
  Purple = 'Purple',
  Brown = 'Brown',
  Aqua = 'Aqua',
  Gold = 'Gold',
  Black = 'Black',
  Orange = 'Orange',
}

const defaultBannerFilters = {
  [Banner.Green]: true,
  [Banner.Blue]: true,
  [Banner.Red]: true,
  [Banner.Purple]: true,
  [Banner.Brown]: true,
  [Banner.Aqua]: true,
  [Banner.Gold]: true,
  [Banner.Black]: true,
  [Banner.Orange]: true,
}

const bannerIndexMap = {
  [Banner.Green]: 1,
  [Banner.Blue]: 2,
  [Banner.Red]: 3,
  [Banner.Purple]: 4,
  [Banner.Brown]: 5,
  [Banner.Aqua]: 6,
  [Banner.Gold]: 8,
  [Banner.Black]: 9,
  [Banner.Orange]: 10,
}

export const allBanners: Banner[] = Object.values(Banner)

export const useBannerFilters = () => {
  const [bannerFilters, setBannerFilters] = useState<Record<string, boolean>>(defaultBannerFilters)

  const selectedBannerIndices = Object.keys(bannerFilters)
    .filter((key) => bannerFilters[key])
    .map((banner) => bannerIndexMap[banner as keyof typeof bannerIndexMap])

  const isBannerIndexSelected = (index: number) => {
    return selectedBannerIndices.includes(index)
  }

  const handleBannerFilterToggle = (banner: string) => {
    setBannerFilters((prevFilters) => ({
      ...prevFilters,
      [banner]: !prevFilters[banner],
    }))
  }

  const resetBannerFilters = () => {
    setBannerFilters(defaultBannerFilters)
  }

  return {
    bannerFilters,
    isBannerIndexSelected,
    handleBannerFilterToggle,
    resetBannerFilters,
  }
}
