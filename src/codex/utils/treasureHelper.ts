import { logger } from '@/shared/utils/logger'

import { CardData } from '@/codex/types/cards'
import { Event } from '@/codex/types/events'
import { EnrichedTreasureCard, RelatedCard, TreasureCard } from '@/codex/types/treasures'
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

const resolveEvents = (eventNames: string[]): Event[] =>
  eventNames.flatMap((name) => {
    const eventDetails = EVENTS_BY_NAME.get(name)

    if (!eventDetails) {
      logger.warn(`No event data found for treasure event: ${name}`)
      return []
    }

    return [eventDetails]
  })

export const getRelatedEvents = (treasure: TreasureCard): Event[] =>
  resolveEvents(treasure.fromEvents)

export const getRelatedTreasurePoolEvents = (treasure: TreasureCard): Event[] =>
  resolveEvents(treasure.fromTreasureEvents)

export const getRelatedTreasurePoolCards = (
  treasure: TreasureCard,
  cardData: CardData[] | undefined
): RelatedCard[] => {
  const cardsByName = new Map((cardData ?? []).map((card) => [card.name, card]))

  const cards = treasure.fromCards.map((name) => {
    const cardDetails = cardsByName.get(name)

    return {
      name,
      isTalent: false,
      category: cardDetails?.category,
    }
  })

  const talents = treasure.fromTalents.map((name) => ({ name, isTalent: true }))

  return [...cards, ...talents]
}
