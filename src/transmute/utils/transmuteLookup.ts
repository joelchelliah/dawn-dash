import {
  CannotBeSourceGroup,
  CardColorAndRarity,
  TransmuteEnergyAttribute,
  TransmuteMode,
  TransmuteRules,
} from '@/transmute/types/rules'
import transmuteRules from '@/transmute/data/transmute-rules.json'

// The JSON import types `[9, 4]` as `number[]`, so cast through `unknown` to keep the tuple type
const RULES = transmuteRules as unknown as TransmuteRules

// `CardData` numbering. Monster is rarity 4, so "one rarity up" is not `rarity + 1`.
export const RARITY = { Common: 0, Uncommon: 1, Rare: 2, Legendary: 3, Monster: 4 } as const
export const COLOR = {
  Green: 1,
  Blue: 2,
  Red: 3,
  Purple: 4,
  Brown: 5,
  Aqua: 6,
  White: 7,
  Holy: 8,
  Black: 9,
  Orange: 10,
  Monster: 11,
} as const

const NEXT_RARITY: Record<number, number> = {
  [RARITY.Monster]: RARITY.Common,
  [RARITY.Common]: RARITY.Uncommon,
  [RARITY.Uncommon]: RARITY.Rare,
  [RARITY.Rare]: RARITY.Legendary,
  [RARITY.Legendary]: RARITY.Legendary,
}

// The inverse of `NEXT_RARITY`: Legendary is reached from both Rare and Legendary
const PREVIOUS_RARITIES: Record<number, number[]> = {
  [RARITY.Common]: [RARITY.Monster],
  [RARITY.Uncommon]: [RARITY.Common],
  [RARITY.Rare]: [RARITY.Uncommon],
  [RARITY.Legendary]: [RARITY.Rare, RARITY.Legendary],
  [RARITY.Monster]: [],
}

// Any one energy attribute is enough. A color left out needs nothing.
const ENERGY_ATTRIBUTES_BY_COLOR: Partial<Record<number, TransmuteEnergyAttribute[]>> = {
  [COLOR.Green]: ['dex'],
  [COLOR.Blue]: ['int'],
  [COLOR.Red]: ['str'],
  [COLOR.Holy]: ['holy'],
  [COLOR.Aqua]: ['dex', 'int'],
  [COLOR.Orange]: ['dex', 'str'],
  [COLOR.Purple]: ['int', 'str'],
}

const bucketKey = (color: number, rarity: number) => `${color}|${rarity}`

const groupByBucket = (ids: number[]) => {
  const buckets = new Map<string, number[]>()
  for (const id of ids) {
    const [color, rarity] = RULES.cards[id]
    const key = bucketKey(color, rarity)
    buckets.set(key, [...(buckets.get(key) ?? []), id])
  }
  return buckets
}

const TRADEPOST_REMOVES = new Set(RULES.tradepost.removes)
const TRADEPOST_IDS = [...RULES.pool, ...RULES.tradepost.adds].filter(
  (id) => !TRADEPOST_REMOVES.has(id)
)

const POOL = new Set(RULES.pool)
const POOL_BY_BUCKET = groupByBucket(RULES.pool)
const TRADEPOST = new Set(TRADEPOST_IDS)
const TRADEPOST_BY_BUCKET = groupByBucket(TRADEPOST_IDS)
const MONSTER_SIDEMUTE = new Set(RULES.monsterSidemute)
const ALL_CARD_IDS = Object.keys(RULES.cards).map(Number)
const CARDS_BY_BUCKET = groupByBucket(ALL_CARD_IDS)
const MONSTER_BANNER_IDS = ALL_CARD_IDS.filter((id) => RULES.cards[id][0] === COLOR.Monster)

const BLOCKING_GROUPS: Record<TransmuteMode, Map<number, CannotBeSourceGroup>> = {
  transmute: new Map(),
  sidemute: new Map(),
  tradepost: new Map(),
}
for (const group of RULES.cannotBeSource) {
  for (const mode of group.blocks) {
    for (const id of group.cards) BLOCKING_GROUPS[mode].set(id, group)
  }
}

export const getCardColorAndRarity = (id: number): CardColorAndRarity | undefined => RULES.cards[id]

// Gates the Transmute mode only, and is checked on the *result*
export const canReachWithEnergyAttributes = (
  id: number,
  energyAttributes: readonly TransmuteEnergyAttribute[]
) => {
  const required =
    RULES.castRequirements[id] ?? ENERGY_ATTRIBUTES_BY_COLOR[RULES.cards[id][0]] ?? []
  return required.length === 0 || required.some((attribute) => energyAttributes.includes(attribute))
}

/*
 * `monster`: the Monster-banner sidemute, which mixes rarities and ignores card sets.
 * `black-to-brown`: a Black source sidemutes into Brown, so the results aren't its color.
 */
export type LookupBranch = 'normal' | 'monster' | 'black-to-brown'

export type LookupResult =
  | {
      kind: 'ids'
      ids: number[]
      // Candidates the ticked energy attributes excluded. Only Transmute _From_ fills this.
      excludedByEnergyAttributes: number[]
      branch: LookupBranch
    }
  | { kind: 'unknown' }
  | { kind: 'white' }
  | { kind: 'blocked'; group: CannotBeSourceGroup }
  | { kind: 'not-a-result' }
  // Black is never a sidemute result: Black sidemutes into Brown
  | { kind: 'black-target' }
  | { kind: 'unreachable-with-energy-attributes' }

const ids = (list: number[], branch: LookupBranch = 'normal'): LookupResult => ({
  kind: 'ids',
  ids: list,
  excludedByEnergyAttributes: [],
  branch,
})

const without = (list: number[] | undefined, id: number) => (list ?? []).filter((x) => x !== id)

// The checks every _From_ lookup starts with. Returns a result only when it ends the lookup.
const checkSource = (id: number, mode: TransmuteMode): LookupResult | undefined => {
  const colorAndRarity = RULES.cards[id]
  if (!colorAndRarity) return { kind: 'unknown' }
  // Every lookup comes back empty, but the game falls back to something else
  if (colorAndRarity[0] === COLOR.White) return { kind: 'white' }
  const group = BLOCKING_GROUPS[mode].get(id)
  if (group) return { kind: 'blocked', group }
  return undefined
}

export const getTransmuteResults = (
  id: number,
  energyAttributes: readonly TransmuteEnergyAttribute[]
): LookupResult => {
  const stop = checkSource(id, 'transmute')
  if (stop) return stop

  const [color, rarity] = RULES.cards[id]
  const candidates = without(POOL_BY_BUCKET.get(bucketKey(color, NEXT_RARITY[rarity])), id)
  return {
    kind: 'ids',
    ids: candidates.filter((x) => canReachWithEnergyAttributes(x, energyAttributes)),
    excludedByEnergyAttributes: candidates.filter(
      (x) => !canReachWithEnergyAttributes(x, energyAttributes)
    ),
    branch: 'normal',
  }
}

export const getSidemuteResults = (id: number): LookupResult => {
  const stop = checkSource(id, 'sidemute')
  if (stop) return stop

  // Keyed on the banner, not the rarity: a Monster-rarity card with another banner is blocked above
  const [color, rarity] = RULES.cards[id]
  if (color === COLOR.Monster) return ids(without(RULES.monsterSidemute, id), 'monster')
  if (color === COLOR.Black) {
    return ids(POOL_BY_BUCKET.get(bucketKey(COLOR.Brown, rarity)) ?? [], 'black-to-brown')
  }
  return ids(without(POOL_BY_BUCKET.get(bucketKey(color, rarity)), id))
}

// The source stays in the list, since Tradepost offers back the card it replaces. No candidate is
// Monster rarity, so a Monster-rarity source finds nothing.
export const getTradepostResults = (id: number): LookupResult => {
  const stop = checkSource(id, 'tradepost')
  if (stop) return stop

  const [color, rarity] = RULES.cards[id]
  return ids(TRADEPOST_BY_BUCKET.get(bucketKey(color, rarity)) ?? [])
}

const withoutBlocked = (list: number[], mode: TransmuteMode) =>
  list.filter((x) => !BLOCKING_GROUPS[mode].has(x))

export const getTransmuteSources = (
  id: number,
  energyAttributes: readonly TransmuteEnergyAttribute[]
): LookupResult => {
  if (!RULES.cards[id]) return { kind: 'unknown' }
  if (!POOL.has(id)) return { kind: 'not-a-result' }
  if (!canReachWithEnergyAttributes(id, energyAttributes))
    return { kind: 'unreachable-with-energy-attributes' }

  const [color, rarity] = RULES.cards[id]
  const sources = PREVIOUS_RARITIES[rarity].flatMap(
    (sourceRarity) => CARDS_BY_BUCKET.get(bucketKey(color, sourceRarity)) ?? []
  )
  return ids(withoutBlocked(without(sources, id), 'transmute'))
}

export const getSidemuteSources = (id: number): LookupResult => {
  if (!RULES.cards[id]) return { kind: 'unknown' }
  if (MONSTER_SIDEMUTE.has(id)) {
    return ids(withoutBlocked(without(MONSTER_BANNER_IDS, id), 'sidemute'), 'monster')
  }

  const [color, rarity] = RULES.cards[id]
  if (color === COLOR.Black) return { kind: 'black-target' }
  // A Monster-banner source never takes the color-and-rarity path, so neither does its result
  if (!POOL.has(id) || color === COLOR.Monster) return { kind: 'not-a-result' }

  const sources = [
    ...(CARDS_BY_BUCKET.get(bucketKey(color, rarity)) ?? []),
    ...(color === COLOR.Brown ? (CARDS_BY_BUCKET.get(bucketKey(COLOR.Black, rarity)) ?? []) : []),
  ]
  return ids(withoutBlocked(without(sources, id), 'sidemute'))
}

// X is included. No Tradepost result is Monster rarity, so no Monster-rarity card is ever a source.
export const getTradepostSources = (id: number): LookupResult => {
  if (!RULES.cards[id]) return { kind: 'unknown' }
  if (!TRADEPOST.has(id)) return { kind: 'not-a-result' }

  const [color, rarity] = RULES.cards[id]
  return ids(withoutBlocked(CARDS_BY_BUCKET.get(bucketKey(color, rarity)) ?? [], 'tradepost'))
}
