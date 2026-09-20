import { logger } from '@/shared/utils/logger'

import { CardData } from '@/codex/types/cards'
import { Event } from '@/codex/types/events'
import {
  EnrichedEvent,
  EnrichedTreasureCard,
  PoolReachedBy,
  RelatedCard,
  TreasureCard,
  TreasurePool,
  TreasureSource,
} from '@/codex/types/treasures'
import eventTrees from '@/codex/data/event-trees.json'
import { SpecialWeapon } from '@/codex/types/weapons'
import specialWeapons from '@/codex/data/special-weapons.json'
import treasureCards from '@/codex/data/treasure-cards.json'
import treasurePools from '@/codex/data/treasure-pools.json'

const TREASURE_CARDS = treasureCards as TreasureCard[]
const SPECIAL_WEAPONS = specialWeapons as SpecialWeapon[]

export const EVENTS_BY_NAME = new Map((eventTrees as Event[]).map((event) => [event.name, event]))

export const getEventArtwork = (name: string): string => EVENTS_BY_NAME.get(name)?.artwork ?? ''

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

/*
 * The card array is the whole ~3000-card payload and changes identity only on a resync, so the
 * name lookup is built once per array rather than per modal render.
 */
let cardsByNameCache: { source: CardData[]; byName: Map<string, CardData> } | null = null

const getCardsByName = (cardData: CardData[] | undefined): Map<string, CardData> => {
  if (!cardData) return new Map()
  if (cardsByNameCache?.source === cardData) return cardsByNameCache.byName

  const byName = new Map(cardData.map((card) => [card.name, card]))
  cardsByNameCache = { source: cardData, byName }

  return byName
}

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
  const cardsByName = getCardsByName(cardData)

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

export interface OtherPool {
  name: string
  sources: PoolReachedBy[]
}

export const getOtherPools = (coveredPools: string[]): OtherPool[] => {
  const covered = new Set(coveredPools.map(toBasePoolName))
  const byPool = new Map<string, Map<string, PoolReachedBy>>()

  const entries: (TreasureCard | SpecialWeapon)[] = [...TREASURE_CARDS, ...SPECIAL_WEAPONS]

  entries
    .flatMap(({ fromEvents, fromCards, fromTalents }) => [
      ...fromEvents,
      ...fromCards,
      ...fromTalents,
    ])
    .forEach(({ name, sourceType, pools }) => {
      toDisplayPools(pools)
        .filter((pool) => !covered.has(pool))
        .forEach((pool) => {
          const sources = byPool.get(pool) ?? new Map<string, PoolReachedBy>()

          sources.set(`${name}-${sourceType}`, { name, sourceType })
          byPool.set(pool, sources)
        })
    })

  return Array.from(byPool.entries())
    .map(([name, sources]) => ({
      name,
      sources: Array.from(sources.values()).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/*
 * What share of a pool is Treasure cards. Both halves come from the data — the pool's declared
 * `size` and the treasures that name it as a source — so a resync moves the figure instead of
 * leaving hardcoded copy behind.
 */
export const getTreasureShareOfPool = (poolNames: string[]): number | null => {
  const pools = new Set(poolNames.map(toBasePoolName))

  const size = Math.max(
    0,
    ...(treasurePools as TreasurePool[])
      .filter(({ pool }) => pools.has(toBasePoolName(pool)))
      .map(({ size }) => size)
  )

  if (size === 0) return null

  const treasures = TREASURE_CARDS.filter(({ fromEvents, fromCards, fromTalents }) =>
    toDisplayPools(
      [...fromEvents, ...fromCards, ...fromTalents].flatMap(({ pools: sourcePools }) => sourcePools)
    ).some((pool) => pools.has(pool))
  ).length

  return (treasures / size) * 100
}
