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

const toBasePoolName = (pool: string): string => pool.replace(/ \(limited\)$/, '')

const toDisplayPools = (pools: string[]): string[] =>
  Array.from(new Set(pools.map(toBasePoolName))).sort()

type CardWithSources = Pick<TreasureCard, 'fromEvents' | 'fromCards' | 'fromTalents'>

export interface RelatedEvents {
  guaranteed: EnrichedEvent[]
  fromPools: EnrichedEvent[]
  // Distinct events across both lists — they overlap, so the two lengths would double-count
  total: number
}

const resolveEvent = ({ name, pools }: TreasureSource): EnrichedEvent[] => {
  const eventDetails = EVENTS_BY_NAME.get(name)

  if (!eventDetails) {
    logger.warn(`No event data found for treasure event: ${name}`)
    return []
  }

  return [{ ...eventDetails, pools: toDisplayPools(pools) }]
}

/*
 * The two lists overlap on purpose. A source can be both guaranteed *and* pooled — Alchemic Table
 * always offers a Healing Potion *and* draws one from the Potion pool — and those are two genuinely
 * different ways to get the card, so such an event appears in both segments rather than having its
 * pool hidden behind the guarantee. Each filter therefore reads only its own field.
 */
export const getRelatedEvents = (treasure: CardWithSources): RelatedEvents => {
  const guaranteed = treasure.fromEvents
    .filter(({ guaranteed }) => guaranteed)
    .flatMap(resolveEvent)
  const fromPools = treasure.fromEvents
    .filter(({ pools }) => pools.length > 0)
    .flatMap(resolveEvent)

  // Counted after resolving, so an event missing from the event data isn't counted but unlisted
  const names = new Set([...guaranteed, ...fromPools].map(({ name }) => name))

  return { guaranteed, fromPools, total: names.size }
}

export interface RelatedCards {
  guaranteed: RelatedCard[]
  fromPools: RelatedCard[]
  // Distinct cards across both lists — they overlap, so the two lengths would double-count
  total: number
}

/*
 * Split on the same rule as `getRelatedEvents`, and overlapping for the same reason: a source can
 * both hand the card over outright and draw it from a pool, and those are two different ways to
 * get it. Each filter therefore reads only its own field.
 */
export const getRelatedTreasurePoolCards = (
  treasure: CardWithSources,
  cardData: CardData[] | undefined
): RelatedCards => {
  const cardsByName = new Map((cardData ?? []).map((card) => [card.name, card]))

  const toRelatedCard = (isTalent: boolean) => (source: TreasureSource) => ({
    name: source.name,
    isTalent,
    category: isTalent ? undefined : cardsByName.get(source.name)?.category,
    pools: toDisplayPools(source.pools),
  })

  const sources = [
    ...treasure.fromCards.map((source) => ({ source, isTalent: false })),
    ...treasure.fromTalents.map((source) => ({ source, isTalent: true })),
  ]

  const guaranteed = sources
    .filter(({ source }) => source.guaranteed)
    .map(({ source, isTalent }) => toRelatedCard(isTalent)(source))
  const fromPools = sources
    .filter(({ source }) => source.pools.length > 0)
    .map(({ source, isTalent }) => toRelatedCard(isTalent)(source))

  const keys = new Set(
    [...guaranteed, ...fromPools].map(({ name, isTalent }) => `${name}-${isTalent}`)
  )

  return { guaranteed, fromPools, total: keys.size }
}
