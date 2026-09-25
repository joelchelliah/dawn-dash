import { useCallback, useMemo, useRef, useState } from 'react'

import { CardCodexSearchFilterCache } from '@/codex/types/filters'
import { CardData } from '@/codex/types/cards'
import {
  getCardNameFromStrikeKey,
  getCardStrikeKey,
  isCardStruckIn,
} from '@/codex/utils/cardHelper'

export const useCardStrike = (cachedFilters?: CardCodexSearchFilterCache['struckCards']) => {
  // Strike keys, not plain names — see `getCardStrikeKey`
  const [struckCards, setStruckCards] = useState<string[]>(cachedFilters || [])
  const [lastUndoneTrackedCard, setLastUndoneTrackedCard] = useState<string | null>(null)

  const struckCardKeys = useMemo(() => new Set(struckCards), [struckCards])

  /*
   * `isCardStruck` must not change identity when a card is struck, or every memoized row
   * re-renders on each strike. Reading the Set through a ref keeps the callback stable for the
   * hook's lifetime; rows get their own struck state as a boolean prop instead, so only the
   * toggled row re-renders.
   */
  const struckCardKeysRef = useRef(struckCardKeys)
  struckCardKeysRef.current = struckCardKeys

  const isCardStruck = useCallback(
    (card: CardData) => isCardStruckIn(struckCardKeysRef.current, card),
    []
  )

  const toggleCardStrike = useCallback((card: CardData) => {
    const key = getCardStrikeKey(card)

    setStruckCards((prev) =>
      isCardStruckIn(new Set(prev), card)
        ? // Also drops a legacy bare name, which unticks every card sharing it
          prev.filter((struckKey) => struckKey !== key && struckKey !== card.name)
        : [...prev, key]
    )
  }, [])

  const undoLastTrackedCard = useCallback(() => {
    setStruckCards((prev) => {
      if (prev.length === 0) return prev
      setLastUndoneTrackedCard(getCardNameFromStrikeKey(prev[prev.length - 1]))
      return prev.slice(0, -1)
    })
  }, [])

  const resetStruckCards = useCallback(() => setStruckCards([]), [])

  return {
    struckCards,
    struckCardKeys,
    isCardStruck,
    toggleCardStrike,
    undoLastTrackedCard,
    lastUndoneTrackedCard,
    resetStruckCards,
  }
}
