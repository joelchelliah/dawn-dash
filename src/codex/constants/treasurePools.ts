import {
  ShovelImageUrl,
  RingOfPowerImageUrl,
  PirateParlourImageUrl,
} from '@/shared/utils/imageUrls'

import treasurePools from '@/codex/data/treasure-pools.json'
import { PoolReachedBy, TreasurePool } from '@/codex/types/treasures'

export type PoolId = 'booty' | 'treasure' | 'pirate-parlour'

export interface TreasurePoolDisplay {
  id: PoolId
  pools: string[]
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

const COLORS = {
  BOOTY_SHOVEL: '#c46e17',
  BOOTY_SHOVEL_ACCENT: '#eb943d',
  ONLY_TREASURE: '#2ea17a',
  ONLY_TREASURE_ACCENT: '#4fc29c',
  PIRATE_PARLOUR: '#3e6dbf',
  PIRATE_PARLOUR_ACCENT: '#578ae3',
}

export const TREASURE_POOL_DISPLAYS: TreasurePoolDisplay[] = [
  {
    id: 'booty',
    pools: ['Booty pool'],
    imageSrc: ShovelImageUrl,
    color: COLORS.BOOTY_SHOVEL,
    colorAccent: COLORS.BOOTY_SHOVEL_ACCENT,
    excludedRewards: ['Junk Items'],
  },
  {
    id: 'treasure',
    pools: ['Treasure pool', 'Treasure pool (limited)'],
    imageSrc: RingOfPowerImageUrl,
    color: COLORS.ONLY_TREASURE,
    colorAccent: COLORS.ONLY_TREASURE_ACCENT,
    collapsedEventSource: 'All Treasure events',
  },
  {
    id: 'pirate-parlour',
    pools: ['Pirate Parlour pool'],
    imageSrc: PirateParlourImageUrl,
    color: COLORS.PIRATE_PARLOUR,
    colorAccent: COLORS.PIRATE_PARLOUR_ACCENT,
  },
]

const TREASURE_POOLS = treasurePools as TreasurePool[]

const POOLS_BY_ID = new Map(TREASURE_POOLS.map((pool) => [pool.pool, pool]))

const getMembers = ({ pools }: TreasurePoolDisplay): TreasurePool[] =>
  pools.flatMap((pool) => POOLS_BY_ID.get(pool) ?? [])

/*
 * Falls back to the configured pool key so a display pool whose JSON entry was renamed upstream
 * still renders a name — `findUnmappedPools` is what surfaces the rename itself.
 */
export const getPoolName = (display: TreasurePoolDisplay): string =>
  getMembers(display)[0]?.pool ?? display.pools[0]

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

const describeSource = ({ sourceType, name }: PoolReachedBy): string => `${name} (${sourceType})`

export const getPoolSources = (display: TreasurePoolDisplay): string[] => {
  const reachedBy = getMembers(display).flatMap((pool) => pool.reachedBy)

  const named = reachedBy
    .filter(({ sourceType }) => !(sourceType === 'event' && display.collapsedEventSource))
    .map(describeSource)

  const hasEvents = reachedBy.some(({ sourceType }) => sourceType === 'event')
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
