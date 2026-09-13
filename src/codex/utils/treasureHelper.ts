import { logger } from '@/shared/utils/logger'

import { CardData } from '@/codex/types/cards'
import { Event } from '@/codex/types/events'
import {
  EnrichedEvent,
  EnrichedTreasureCard,
  RelatedCard,
  TreasureCard,
  TreasureSource,
} from '@/codex/types/treasures'
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

/*
 * Collapsing `X pool` and `X pool (limited)` to a single `X pool`.
 */
const toBasePoolName = (pool: string): string => pool.replace(/ \(limited\)$/, '')

// The treasure pools' base name, after `(limited)` has been collapsed away.
const TREASURE_POOL_NAME = 'Treasure pool'

const uniqueNameAndPoolPairs = (
  sources: TreasureSource[]
): Map<string, Set<string | undefined>> => {
  const poolsByName = new Map<string, Set<string | undefined>>()

  for (const { name, pool } of sources) {
    const pools = poolsByName.get(name) ?? new Set<string | undefined>()

    poolsByName.set(name, pools.add(pool ? toBasePoolName(pool) : undefined))
  }

  return poolsByName
}

const resolveEvents = (sources: TreasureSource[]): EnrichedEvent[] =>
  Array.from(uniqueNameAndPoolPairs(sources), ([name, pools]) => {
    const eventDetails = EVENTS_BY_NAME.get(name)

    if (!eventDetails) {
      logger.warn(`No event data found for treasure event: ${name}`)
      return []
    }

    return Array.from(pools, (pool) => ({ ...eventDetails, pool }))
  }).flat()

export interface RelatedEvents {
  guaranteed: EnrichedEvent[]
  fromTreasurePool: EnrichedEvent[]
  fromOtherPools: EnrichedEvent[]
}

export const getRelatedEvents = (treasure: TreasureCard): RelatedEvents => {
  const events = resolveEvents(treasure.fromEvents)

  return {
    guaranteed: events.filter(({ pool }) => !pool),
    fromTreasurePool: events.filter(({ pool }) => pool === TREASURE_POOL_NAME),
    fromOtherPools: events.filter(({ pool }) => pool && pool !== TREASURE_POOL_NAME),
  }
}

export const getRelatedTreasurePoolCards = (
  treasure: TreasureCard,
  cardData: CardData[] | undefined
): RelatedCard[] => {
  const cardsByName = new Map((cardData ?? []).map((card) => [card.name, card]))

  const cards = Array.from(uniqueNameAndPoolPairs(treasure.fromCards), ([name, pools]) => {
    const cardDetails = cardsByName.get(name)

    return Array.from(pools, (pool) => ({
      name,
      isTalent: false,
      category: cardDetails?.category,
      pool,
    }))
  }).flat()

  const talents = Array.from(uniqueNameAndPoolPairs(treasure.fromTalents), ([name, pools]) =>
    Array.from(pools, (pool) => ({ name, isTalent: true, pool }))
  ).flat()

  return [...cards, ...talents]
}
