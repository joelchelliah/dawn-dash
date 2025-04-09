import { useState } from 'react'

enum Rarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Legendary = 'Legendary',
}

const defaultRarityFilters = {
  [Rarity.Common]: false,
  [Rarity.Uncommon]: false,
  [Rarity.Rare]: true,
  [Rarity.Legendary]: true,
}

const rarityIndexMap = {
  [Rarity.Common]: 0,
  [Rarity.Uncommon]: 1,
  [Rarity.Rare]: 2,
  [Rarity.Legendary]: 3,
}

export const allRarities: Rarity[] = Object.values(Rarity)

export const useRarityFilters = () => {
  const [rarityFilters, setRarityFilters] = useState<Record<string, boolean>>(defaultRarityFilters)

  const selectedRarityIndices = Object.keys(rarityFilters)
    .filter((key) => rarityFilters[key])
    .map((rarity) => rarityIndexMap[rarity as keyof typeof rarityIndexMap])

  const isRarityIndexSelected = (index: number) => {
    return selectedRarityIndices.includes(index)
  }

  const handleRarityFilterToggle = (rarity: string) => {
    setRarityFilters((prevFilters) => ({
      ...prevFilters,
      [rarity]: !prevFilters[rarity],
    }))
  }

  const resetRarityFilters = () => {
    setRarityFilters(defaultRarityFilters)
  }

  return {
    rarityFilters,
    isRarityIndexSelected,
    handleRarityFilterToggle,
    resetRarityFilters,
  }
}
