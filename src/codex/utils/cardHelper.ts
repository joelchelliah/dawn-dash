import {
  DexImageUrl,
  HealthImageUrl,
  HolyImageUrl,
  IntImageUrl,
  StrImageUrl,
} from '@/shared/utils/imageUrls'

import { CardData } from '@/codex/types/cards'

const NON_COLLECTIBLE_CATEGORIES = [
  3, // Conjurations
  6, // Summons
  7, // Performances
  8, // Forms
  13, // Attunements
  16, // Ingredients
  19, // Offerings
]
const NON_COLLECTIBLE_CATEGORIES_FOR_MONSTER_EXPANSION = [
  1, // Items
  4, // Enchantments
  11, // Revelations
  12, // Affixes
  14, // Equipment effects
  17, // Paths II and III
]

const NON_COLLECTIBLE_CARDS = [
  'Ascension I',
  'Ascension II',
  'Ascension III',

  'Hymn of Penance I',
  'Hymn of Penance II',
  'Hymn of Penance III',

  'Hymn of Power I',
  'Hymn of Power II',
  'Hymn of Power III',

  'Hymn of Vitality I',
  'Hymn of Vitality II',
  'Hymn of Vitality III',

  'Hymn of Light I',
  'Hymn of Light II',
  'Hymn of Light III',

  'The Dawnbringer',

  'Elite Lightning Bolt',
  'Elite Fireball',
  'Elite Frostbolt',

  'Soulfire Bomb',
  'Shrapnel Bomb',

  'Imp Offer 1',
  'Imp Offer 2',
  'Imp Offer 3',
  'Imp Offer 4',
  'Imp Offer 5',
  'Imp Offer 6',
  'Offer of Doom',

  'Battlespear C',
  'Battlespear D',
  'Battlespear E',
  'Battlespear H',
  'Battlespear L',
  'Battlespear U',

  'City of Gold',
  'Font of Youth',
  'Sunken Forge',
  'Wasteland',

  'Alignment',
  'Bloodbank',
  'Vexing Echo 1',
  'Vexing Echo 2',

  'Pirate Ink I',
  'Pirate Ink II',
  'Pirate Ink III',

  'Larceny INT',
  'Larceny STR',
  'Larceny DEX',
  'Larceny HOLY',
]

export const hasMonsterExpansion = (card: CardData) => card.expansion === 0
export const hasMonsterRarity = (card: CardData) => card.rarity === 4
export const hasMonsterBanner = (card: CardData) => card.color === 11

export const isNonCollectibleRegularCard = (card: CardData) =>
  !hasMonsterExpansion(card) &&
  (NON_COLLECTIBLE_CATEGORIES.includes(card.category) ||
    NON_COLLECTIBLE_CARDS.some((cardName) => cardName.toLowerCase() === card.name.toLowerCase()))

export const isNonCollectibleMonsterCard = (card: CardData) =>
  hasMonsterExpansion(card) &&
  (NON_COLLECTIBLE_CATEGORIES_FOR_MONSTER_EXPANSION.includes(card.category) ||
    NON_COLLECTIBLE_CARDS.some((cardName) => cardName.toLowerCase() === card.name.toLowerCase()))

export const isNonCollectible = (card: CardData) =>
  isNonCollectibleRegularCard(card) || isNonCollectibleMonsterCard(card)

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
