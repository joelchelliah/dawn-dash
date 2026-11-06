import { getCardSetName } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import { CardData } from '@/shared/types/cards'
import { CardSetFilterOption } from '@/shared/types/filters'
import { isNonCollectible } from '@/shared/utils/cardHelper'
import { logger } from '@/shared/utils/logger'

import { getCardColorAndRarity } from './transmuteLookup'

export interface TransmuteCards {
  // Deckable cards the data knows, keyed by game id, with the data's color and rarity
  byId: Map<number, CardData>
  liveIds: Set<number>
}

export const buildTransmuteCards = (cards: CardData[]): TransmuteCards => {
  const byId = new Map<number, CardData>()
  for (const card of cards) {
    const colorAndRarity = getCardColorAndRarity(card.blightbane_id)
    if (!colorAndRarity || isNonCollectible(card)) continue
    const [color, rarity] = colorAndRarity
    byId.set(card.blightbane_id, { ...card, color, rarity })
  }
  return { byId, liveIds: new Set(cards.map((card) => card.blightbane_id)) }
}

const warnedIds = new Set<number>()

// Ids missing from the live cards are data drift (Booty's `findUnmappedPools` story): skipped, warned once
export const toCards = (ids: number[], { byId, liveIds }: TransmuteCards) =>
  ids.flatMap((id) => {
    const card = byId.get(id)
    if (card) return [card]
    if (!liveIds.has(id) && !warnedIds.has(id)) {
      warnedIds.add(id)
      logger.warn(`Transmute data id ${id} is missing from the live card data`)
    }
    return []
  })

// Class starting cards: the game only offers them once a player has unlocked them
export const isMetaprogressCard = (card: CardData) =>
  getCardSetName(card.expansion) === CardSetFilterOption.Metaprogress

const getRarityRank = (rarity: number) => (rarity === 4 ? -1 : rarity)

export const sortLikeCardex = (cards: CardData[]) =>
  [...cards].sort(
    (a, b) =>
      a.color - b.color ||
      getRarityRank(b.rarity) - getRarityRank(a.rarity) ||
      a.name.localeCompare(b.name) ||
      a.blightbane_id - b.blightbane_id
  )
