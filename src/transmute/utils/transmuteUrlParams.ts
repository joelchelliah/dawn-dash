import { CardData } from '@/shared/types/cards'

import { TransmuteMode } from '@/transmute/types/rules'
import {
  ALL_DIRECTIONS,
  ALL_MODES,
  DEFAULT_DIRECTION,
  DEFAULT_MODE,
  TransmuteDirection,
} from '@/transmute/types/filters'

import { TransmuteCards } from './transmuteCards'

export const CARD_PARAM = 'card'
export const MODE_PARAM = 'mode'

const MODE_SEPARATOR = '-'
// No card name ends in `-<digits>`, so this suffix can't be mistaken for part of a name
const ID_SUFFIX_PATTERN = /-(\d+)$/

const toNameSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '_')

// Slugs more than one of the tool's cards share. Wider than `hasDuplicateName`, which is
// case-sensitive and misses `Detonate`/`DETONATE`. Built once per card list.
const sharedSlugsCache = new WeakMap<TransmuteCards, Set<string>>()
const getSharedSlugs = (cards: TransmuteCards) => {
  const cached = sharedSlugsCache.get(cards)
  if (cached) return cached

  const counts = new Map<string, number>()
  for (const card of Array.from(cards.byId.values())) {
    const slug = toNameSlug(card.name)
    counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  const shared = new Set(
    Array.from(counts)
      .filter(([, count]) => count > 1)
      .map(([slug]) => slug)
  )
  sharedSlugsCache.set(cards, shared)
  return shared
}

// Cards sharing a slug get their id appended, since the name alone can't tell them apart
export const toCardSlug = (card: CardData, cards: TransmuteCards) => {
  const slug = toNameSlug(card.name)
  return getSharedSlugs(cards).has(slug) ? `${slug}-${card.blightbane_id}` : slug
}

/*
 * The exact name first, then a trailing `-<id>`, which also resolves a card renamed since the link
 * was shared. A bare shared name picks the lowest id, so it at least resolves the same way every time.
 */
export const findCardBySlug = (slug: string, { byId }: TransmuteCards): CardData | null => {
  const normalized = slug.toLowerCase()

  const byName = Array.from(byId.values())
    .filter((card) => toNameSlug(card.name) === normalized)
    .sort((a, b) => a.blightbane_id - b.blightbane_id)[0]
  if (byName) return byName

  const idMatch = ID_SUFFIX_PATTERN.exec(normalized)
  return (idMatch && byId.get(Number(idMatch[1]))) || null
}

// The short form: `sidemute`, `transmute-to`. The default, Transmute _From_, has no param at all.
export const encodeModeParam = (
  mode: TransmuteMode,
  direction: TransmuteDirection
): string | undefined => {
  if (mode === DEFAULT_MODE && direction === DEFAULT_DIRECTION) return undefined
  return direction === DEFAULT_DIRECTION ? mode : `${mode}${MODE_SEPARATOR}${direction}`
}

// `null` for an unrecognised value, which leaves the defaults in place. A bare mode means _From_.
export const decodeModeParam = (
  value: string
): { mode: TransmuteMode; direction: TransmuteDirection } | null => {
  const [mode, direction = DEFAULT_DIRECTION, ...rest] = value.toLowerCase().split(MODE_SEPARATOR)

  if (rest.length > 0) return null
  if (!ALL_MODES.includes(mode as TransmuteMode)) return null
  if (!ALL_DIRECTIONS.includes(direction as TransmuteDirection)) return null

  return { mode: mode as TransmuteMode, direction: direction as TransmuteDirection }
}
