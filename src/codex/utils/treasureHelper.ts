import { logger } from '@/shared/utils/logger'

import { CardData } from '@/codex/types/cards'
import { Event } from '@/codex/types/events'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import eventTrees from '@/codex/data/event-trees.json'
import treasureCards from '@/codex/data/treasure-cards.json'

const TREASURE_CARDS = treasureCards as TreasureCard[]
const EVENTS_BY_NAME = new Map((eventTrees as Event[]).map((event) => [event.name, event]))

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

export const getTreasureEvents = (treasure: TreasureCard): Event[] =>
  treasure.fromEvents.flatMap(({ event }) => {
    const eventDetails = EVENTS_BY_NAME.get(event)

    if (!eventDetails) {
      logger.warn(`No event data found for treasure event: ${event}`)
      return []
    }

    return [eventDetails]
  })
