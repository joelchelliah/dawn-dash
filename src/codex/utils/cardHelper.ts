import {
  DexImageUrl,
  HealthImageUrl,
  HolyImageUrl,
  IntImageUrl,
  StrImageUrl,
} from '../../shared/utils/imageUrls'
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
  'Battlespear C',
  'Battlespear D',
  'Battlespear E',
  'Battlespear H',
  'Battlespear L',
  'Battlespear U',
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

export const parseCardDescription = (description: string, iconClassName: string) =>
  description
    .replace(/<br\s*\/?>/g, '<br />') // Normalize <br> tags
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )
    .replaceAll('HEALTH', `<img class="${iconClassName}" src="${HealthImageUrl}" alt="HEALTH" />`)
    .replaceAll('HOLY', `<img class="${iconClassName}" src="${HolyImageUrl}" alt="HOLY" />`)
    .replaceAll('STR', `<img class="${iconClassName}" src="${StrImageUrl}" alt="STR" />`)
    .replaceAll('INT', `<img class="${iconClassName}" src="${IntImageUrl}" alt="INT" />`)
    .replaceAll('DEX', `<img class="${iconClassName}" src="${DexImageUrl}" alt="DEX" />`)
    .trim()

export const containsNonCollectible = (cards: CardData[]) =>
  cards.some((card) => isNonCollectible(card))
