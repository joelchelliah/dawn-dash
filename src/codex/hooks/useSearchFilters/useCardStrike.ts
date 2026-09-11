import { useCallback, useMemo, useRef, useState } from 'react'

import { CardCodexSearchFilterCache } from '@/codex/types/filters'
import { CardData } from '@/codex/types/cards'

export const useCardStrike = (cachedFilters?: CardCodexSearchFilterCache['struckCards']) => {
  const [struckCards, setStruckCards] = useState<string[]>(cachedFilters || [])
  const [lastUndoneTrackedCard, setLastUndoneTrackedCard] = useState<string | null>(null)

  const struckCardNames = useMemo(() => new Set(struckCards), [struckCards])

  /*
   * `isCardStruck` must not change identity when a card is struck, or every memoized row
   * re-renders on each strike. Reading the Set through a ref keeps the callback stable for the
   * hook's lifetime; rows get their own struck state as a boolean prop instead, so only the
   * toggled row re-renders.
   */
  const struckCardNamesRef = useRef(struckCardNames)
  struckCardNamesRef.current = struckCardNames

  const isCardStruck = useCallback(
    (card: CardData) => struckCardNamesRef.current.has(card.name),
    []
  )

  const toggleCardStrike = useCallback((card: CardData) => {
    setStruckCards((prev) =>
      prev.includes(card.name) ? prev.filter((name) => name !== card.name) : [...prev, card.name]
    )
  }, [])

  const undoLastTrackedCard = useCallback(() => {
    setStruckCards((prev) => {
      if (prev.length === 0) return prev
      setLastUndoneTrackedCard(prev[prev.length - 1])
      return prev.slice(0, -1)
    })
  }, [])

  const resetStruckCards = useCallback(() => setStruckCards([]), [])

  return {
    struckCards,
    struckCardNames,
    isCardStruck,
    toggleCardStrike,
    undoLastTrackedCard,
    lastUndoneTrackedCard,
    resetStruckCards,
  }
}
