import { logger } from '@/shared/utils/logger'

import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import treasureCards from '@/codex/data/treasure-cards.json'

const TREASURE_CARDS = treasureCards as TreasureCard[]

export const enrichTreasureCards = (cardData: CardData[] | undefined): EnrichedTreasureCard[] => {
  if (!cardData) return []

  const cardsById = new Map(cardData.map((card) => [card.blightbane_id, card]))

  return TREASURE_CARDS.flatMap((treasureDetails) => {
    const cardDetails = cardsById.get(treasureDetails.id)

    if (!cardDetails) {
      logger.warn(`No card data found for treasure: ${treasureDetails.name}`)
      return []
    }

    return [{ treasureDetails, cardDetails }]
  })
}
