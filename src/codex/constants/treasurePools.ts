import { ChestImageUrl, SunforgeImageUrl, MapOfHuesImageUrl } from '@/shared/utils/imageUrls'

import treasurePools from '@/codex/data/treasure-pools.json'
import { TreasurePool } from '@/codex/types/treasures'

export interface TreasurePoolDisplay {
  id: string
  // Which JSON pools this display pool covers. C and D are merged.
  pools: string[]
  name: string
  imageSrc: string
  colour: string
  colourBright: string
  rewards: PoolReward[]
  sources: string[]
}

export interface PoolReward {
  label: string
  excluded?: boolean
}

export const TREASURE_POOL_DISPLAYS: TreasurePoolDisplay[] = [
  {
    id: 'booty-shovel',
    pools: ['A'],
    name: 'Booty / Shovel',
    imageSrc: ChestImageUrl,
    colour: '#c09528',
    colourBright: '#e7b35f',
    rewards: [
      { label: 'Treasures' },
      { label: 'Equipment' },
      { label: 'Items' },
      { label: 'Junk', excluded: true },
    ],
    sources: ['Booty (card)', 'Shovel (card)'],
  },
  {
    id: 'only-treasures',
    pools: ['C', 'D'],
    name: 'Only treasures',
    imageSrc: SunforgeImageUrl,
    colour: '#2f9c83',
    colourBright: '#53bca9',
    rewards: [{ label: 'Treasures' }],
    sources: ['All treasure events', "Explorer's Trick (card)"],
  },
  {
    id: 'pirate-parlour',
    pools: ['B'],
    name: 'Pirate Parlour',
    imageSrc: MapOfHuesImageUrl,
    colour: '#7f60cd',
    colourBright: '#a681ef',
    rewards: [
      { label: 'Treasures' },
      { label: 'Locations' },
      { label: 'Maps' },
      { label: 'Pirate Tattoos' },
    ],
    sources: ['Pirate Parlour (talent)'],
  },
]

const TREASURE_POOLS = treasurePools as TreasurePool[]

const POOL_SIZES = new Map(TREASURE_POOLS.map(({ pool, size }) => [pool, size]))

/*
 * Merged display pools take the size of their largest member
 */
export const getPoolSize = ({ pools }: TreasurePoolDisplay): number =>
  Math.max(...pools.map((pool) => POOL_SIZES.get(pool) ?? 0))

/*
 * The JSON is the source of truth for *which* pools exist; this file only supplies their copy.
 */
export const findUnmappedPools = (): string[] => {
  const mapped = new Set(TREASURE_POOL_DISPLAYS.flatMap(({ pools }) => pools))

  return TREASURE_POOLS.map(({ pool }) => pool).filter((pool) => !mapped.has(pool))
}
