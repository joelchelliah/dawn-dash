import { useState } from 'react'

import { CardData } from '../types/cards'

export const useCardStrike = () => {
  const [struckCards, setStruckCards] = useState<Record<string, boolean>>({})

  const isCardStruck = (card: CardData) => {
    return struckCards[card.name]
  }

  const toggleCardStrike = (card: CardData) => {
    setStruckCards((prev) => ({
      ...prev,
      [card.name]: !prev[card.name],
    }))
  }

  const resetStruckCards = () => {
    setStruckCards({})
  }

  return { isCardStruck, toggleCardStrike, resetStruckCards }
}
