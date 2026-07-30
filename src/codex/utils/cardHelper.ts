import {
  DexImageUrl,
  HealthImageUrl,
  HolyImageUrl,
  IntImageUrl,
  StrImageUrl,
} from '@/shared/utils/imageUrls'

import { CardData } from '@/codex/types/cards'

const NON_COLLECTIBLE_CATEGORIES = [
  6, // Summons
  7, // Performances
  8, // Forms
  13, // Attunements
  19, // Offerings
]
// Categories that are only non-collectible within the nil (unset) expansion
const NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION = [
  1, // Items
  4, // Enchantments
  6, // Summons
  7, // Performances
  8, // Forms
  9, // Hymn
  11, // Revelations
  12, // Affixes
  13, // Attunements
  14, // Equipment effects
  15, // Code
  17, // Paths II and III
  18, // Location
  19, // Offerings
  20, // Mantra
  21, // Adaptations
]

const NON_COLLECTIBLE_CARDS = [
  'Alignment',
  'Bloodbank',
  'Vexing Echo 1',
  'Vexing Echo 2',
  'Pacified',

  // Imp Offers
  'Imp Offer 1',
  'Imp Offer 2',
  'Imp Offer 3',
  'Imp Offer 4',
  'Imp Offer 5',
  'Imp Offer 6',

  // Lost Lagoon
  'City of Gold',
  'Font of Youth',
  'Sunken Forge',
  'Wasteland',

  // Pirate Ink
  'Pirate Ink I',
  'Pirate Ink II',
  'Pirate Ink III',
  'Pirate Ink IV',
  'Pirate Ink V',

  // Larceny
  'Larceny INT',
  'Larceny STR',
  'Larceny DEX',
  'Larceny HOLY',

  // Compel
  'Compel 1',
  'Compel 2',

  // Treaties
  'Treaty of Joy',
  'Treaty of Insight',
  'Treaty of Might',
  'Treaty of Peace',
  'Treaty of Mercy',

  // Agile Mind
  'Agile',
  'Mind',

  // Hypnosis
  'Hypnosis 1',
  'Hypnosis 2',

  // Typhon's Cunning
  "Typhon's Cunning II",
  "Typhon's Cunning III",

  // That card that does one of these things
  'Haste',
  'Slow',
  'Draw',
]

/*
 * Marker appended to the 'Core' label for cards and talents from the nil (0) expansion,
 */
export const NIL_EXPANSION_MARKER = '°'

export const hasMonsterRarity = (card: CardData) => card.rarity === 4
export const hasMonsterBanner = (card: CardData) => card.color === 11
export const isAnimalCompanionCard = (card: CardData) => card.name.endsWith('(Companion)')

/*
 * Expansion 0 is the game's nil/unset bucket. Only used for picking the right category list
 * below — nil expansion cards are otherwise treated as Core cards, see `useCardSetFilters`.
 */
const hasNilExpansion = (card: CardData) => card.expansion === 0

/*
 * The two category lists are disjoint and mutually exclusive: a category counts as
 * non-collectible either in the nil expansion or outside it, never both. The name
 * blacklist applies regardless of expansion.
 */
export const isNonCollectible = (card: CardData) =>
  NON_COLLECTIBLE_CARDS.some((cardName) => cardName.toLowerCase() === card.name.toLowerCase()) ||
  (hasNilExpansion(card)
    ? NON_COLLECTIBLE_CATEGORIES_FOR_NIL_EXPANSION.includes(card.category)
    : NON_COLLECTIBLE_CATEGORIES.includes(card.category))

export const parseCardDescription = (description: string, iconClassName?: string) => {
  const parsedDescription = description
    .replace(/<br\s*\/?>/g, '<br />') // Normalize <br> tags
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )

  if (!iconClassName) {
    return parsedDescription.trim()
  }

  return parsedDescription
    .replaceAll('HEALTH', `<img class="${iconClassName}" src="${HealthImageUrl}" alt="HEALTH" />`)
    .replaceAll('HOLY', `<img class="${iconClassName}" src="${HolyImageUrl}" alt="HOLY" />`)
    .replaceAll('STR', `<img class="${iconClassName}" src="${StrImageUrl}" alt="STR" />`)
    .replaceAll('INT', `<img class="${iconClassName}" src="${IntImageUrl}" alt="INT" />`)
    .replaceAll('DEX', `<img class="${iconClassName}" src="${DexImageUrl}" alt="DEX" />`)
    .trim()
}

export const containsNonCollectible = (cards: CardData[]) =>
  cards.some((card) => isNonCollectible(card))

export const containsAnimalCompanionCard = (cards: CardData[]) =>
  cards.some((card) => isAnimalCompanionCard(card))
