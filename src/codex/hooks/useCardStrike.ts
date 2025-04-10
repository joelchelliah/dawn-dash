import { useState } from 'react'

import { CardCodexSearchFilterCache } from '../types/filters'
import { CardData } from '../types/cards'

export const useCardStrike = (cachedFilters?: CardCodexSearchFilterCache['struckCards']) => {
  const [struckCards, setStruckCards] = useState<string[]>(cachedFilters || [])

  const isCardStruck = (card: CardData) => {
    return struckCards.includes(card.name)
  }

  const toggleCardStrike = (card: CardData) => {
    setStruckCards((prev) =>
      prev.includes(card.name) ? prev.filter((name) => name !== card.name) : [...prev, card.name]
    )
  }

  const resetStruckCards = () => {
    setStruckCards([])
  }

  return { struckCards, isCardStruck, toggleCardStrike, resetStruckCards }
}
