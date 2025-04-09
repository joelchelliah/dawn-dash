import { useState } from 'react'

enum CardSet {
  Core = 'Core',
  Metaprogress = 'Metaprogress',
  Metamorphosis = 'Metamorphosis',
  Infinitum = 'Infinitum',
  Catalyst = 'Catalyst',
  Eclypse = 'Eclypse',
}

const defaultCardSetFilterValueMap = {
  [CardSet.Core]: true,
  [CardSet.Metaprogress]: false,
  [CardSet.Metamorphosis]: false,
  [CardSet.Infinitum]: false,
  [CardSet.Catalyst]: false,
  [CardSet.Eclypse]: false,
}

const cardSetIndicesMap = {
  [CardSet.Core]: [1, 4],
  [CardSet.Metaprogress]: [2],
  [CardSet.Metamorphosis]: [3],
  [CardSet.Infinitum]: [5],
  [CardSet.Catalyst]: [6],
  [CardSet.Eclypse]: [7],
}

const indexToCardSetMap = {
  [1]: CardSet.Core,
  [2]: CardSet.Metaprogress,
  [3]: CardSet.Metamorphosis,
  [4]: CardSet.Core,
  [5]: CardSet.Infinitum,
  [6]: CardSet.Catalyst,
  [7]: CardSet.Eclypse,
}

export const allCardSets: CardSet[] = Object.values(CardSet)

export const useCardSetFilters = () => {
  const [cardSetFilters, setCardSetFilters] = useState<Record<string, boolean>>(
    defaultCardSetFilterValueMap
  )

  const selectedCardSetIndices = Object.keys(cardSetFilters)
    .filter((key) => cardSetFilters[key])
    .flatMap((cardSet) => cardSetIndicesMap[cardSet as keyof typeof cardSetIndicesMap])

  const isCardSetIndexSelected = (index: number) => {
    return selectedCardSetIndices.includes(index)
  }

  const getCardSetNameFromIndex = (index: number) => {
    return indexToCardSetMap[index as keyof typeof indexToCardSetMap]
  }

  const handleCardSetFilterToggle = (cardSet: string) => {
    setCardSetFilters((prevFilters) => ({
      ...prevFilters,
      [cardSet]: !prevFilters[cardSet],
    }))
  }

  const resetCardSetFilters = () => {
    setCardSetFilters(defaultCardSetFilterValueMap)
  }

  return {
    cardSetFilters,
    isCardSetIndexSelected,
    getCardSetNameFromIndex,
    handleCardSetFilterToggle,
    resetCardSetFilters,
  }
}
