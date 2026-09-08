import {
  ShovelImageUrl,
  RingOfPowerImageUrl,
  PirateParlourImageUrl,
} from '@/shared/utils/imageUrls'

import treasurePools from '@/codex/data/treasure-pools.json'
import { PoolReachedBy, TreasurePool } from '@/codex/types/treasures'

export type PoolId = 'booty-shovel' | 'only-treasure' | 'pirate-parlour'

export interface TreasurePoolDisplay {
  id: PoolId
  // Which JSON pools this display pool covers. C and D are merged
  pools: string[]
  name: string
  imageSrc: string
  color: string
  colorAccent: string
  excludedRewards?: string[]
  // Replaces the derived per-event source tags with a single tag
  collapsedEventSource?: string
}

export interface PoolReward {
  label: string
  excluded?: boolean
}

export const TREASURE_POOL_DISPLAYS: TreasurePoolDisplay[] = [
  {
    id: 'booty-shovel',
    pools: ['A'],
    name: 'Shovel & Booty',
    imageSrc: ShovelImageUrl,
    color: '#c09528',
    colorAccent: '#e7b35f',
    excludedRewards: ['Junk Items'],
  },
  {
    id: 'only-treasure',
    pools: ['C', 'D'],
    name: 'Only Treasure',
    imageSrc: RingOfPowerImageUrl,
    color: '#2f9c83',
    colorAccent: '#53bca9',
    collapsedEventSource: 'All Treasure events',
  },
  {
    id: 'pirate-parlour',
    pools: ['B'],
    name: 'Pirate Parlour',
    imageSrc: PirateParlourImageUrl,
    color: '#7f60cd',
    colorAccent: '#a681ef',
  },
]

const TREASURE_POOLS = treasurePools as TreasurePool[]

const POOLS_BY_ID = new Map(TREASURE_POOLS.map((pool) => [pool.pool, pool]))

const getMembers = ({ pools }: TreasurePoolDisplay): TreasurePool[] =>
  pools.flatMap((pool) => POOLS_BY_ID.get(pool) ?? [])

/*
 * Merged display pools take the size of their largest member
 */
export const getPoolSize = (display: TreasurePoolDisplay): number =>
  Math.max(0, ...getMembers(display).map(({ size }) => size))

const KNOWN_REWARDS: string[] = [
  'Treasure',
  'Equipment',
  'Items',
  'Maps',
  'Locations',
  'Pirate Ink',
]

export const findUnknownRewards = (): string[] => {
  const categories = TREASURE_POOLS.flatMap(({ contains }) => contains)

  return Array.from(new Set(categories)).filter((category) => !KNOWN_REWARDS.includes(category))
}

export const getPoolRewards = (display: TreasurePoolDisplay): PoolReward[] => {
  const contains = getMembers(display).flatMap(({ contains }) => contains)
  const labels = Array.from(new Set(contains))

  return [
    ...labels.map((label) => ({ label })),
    ...(display.excludedRewards ?? []).map((label) => ({ label, excluded: true })),
  ]
}

const describeSource = ({ card, talent, event }: PoolReachedBy): string | null => {
  if (card) return `${card} (card)`
  if (talent) return `${talent} (talent)`
  if (event) return `${event} (event)`

  return null
}

export const getPoolSources = (display: TreasurePoolDisplay): string[] => {
  const reachedBy = getMembers(display).flatMap((pool) => pool.reachedBy)

  const named = reachedBy
    .filter(({ event }) => !(event && display.collapsedEventSource))
    .flatMap((source) => describeSource(source) ?? [])

  const hasEvents = reachedBy.some(({ event }) => event)
  const collapsed = hasEvents && display.collapsedEventSource ? [display.collapsedEventSource] : []

  return [...collapsed, ...Array.from(new Set(named))]
}

/*
 * The JSON is the source of truth for *which* pools exist; this file only supplies their copy.
 */
export const findUnmappedPools = (): string[] => {
  const mapped = new Set(TREASURE_POOL_DISPLAYS.flatMap(({ pools }) => pools))

  return TREASURE_POOLS.map(({ pool }) => pool).filter((pool) => !mapped.has(pool))
}
