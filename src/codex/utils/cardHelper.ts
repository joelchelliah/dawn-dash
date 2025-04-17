import { CardData } from '../types/cards'

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
  'Elite Lightning Bolt',
  'Elite Fireball',
  'Elite Frostbolt',
  'Soulfire Bomb',
  'Imp Offer 1',
  'Imp Offer 2',
  'Imp Offer 3',
  'Imp Offer 4',
  'Imp Offer 5',
  'Imp Offer 6',
  'Offer of Doom',
]

export const isNonCollectibleForRegularExpansions = ({ name, category }: CardData) =>
  NON_COLLECTIBLE_CARDS.some((card) => card.toLowerCase() === name.toLowerCase()) ||
  NON_COLLECTIBLE_CATEGORIES.includes(category)

export const isNonCollectibleForMonsterExpansion = ({ expansion, category }: CardData) =>
  expansion === 0 && NON_COLLECTIBLE_CATEGORIES_FOR_MONSTER_EXPANSION.includes(category)

export const isNonCollectible = (card: CardData) =>
  isNonCollectibleForRegularExpansions(card) || isNonCollectibleForMonsterExpansion(card)

export const parseCardDescription = (description: string) =>
  description
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>?/g, '')
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )
    .replace(/\n+/g, '\n')
    .trim()

export const containsNonCollectible = (cards: CardData[]) =>
  cards.some((card) => isNonCollectible(card))
