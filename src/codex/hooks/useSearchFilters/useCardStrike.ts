import { useState } from 'react'

import { CardCodexSearchFilterCache } from '@/codex/types/filters'
import { CardData } from '@/codex/types/cards'

export const useCardStrike = (cachedFilters?: CardCodexSearchFilterCache['struckCards']) => {
  const [struckCards, setStruckCards] = useState<string[]>(cachedFilters || [])
  const [lastUndoneTrackedCard, setLastUndoneTrackedCard] = useState<string | null>(null)

  const isCardStruck = (card: CardData) => {
    return struckCards.includes(card.name)
  }

  const toggleCardStrike = (card: CardData) => {
    setStruckCards((prev) =>
      prev.includes(card.name) ? prev.filter((name) => name !== card.name) : [...prev, card.name]
    )
  }

  const undoLastTrackedCard = () => {
    if (struckCards.length > 0) {
      setLastUndoneTrackedCard(struckCards[struckCards.length - 1])
      setStruckCards((prev) => prev.slice(0, -1))
    }
  }

  const resetStruckCards = () => {
    setStruckCards([])
  }

  return {
    struckCards,
    isCardStruck,
    toggleCardStrike,
    undoLastTrackedCard,
    lastUndoneTrackedCard,
    resetStruckCards,
  }
}
