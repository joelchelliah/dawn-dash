import { CardData } from '@/shared/types/cards'
import { isNonCollectible } from '@/shared/utils/cardHelper'

export const hasMonsterRarity = (card: CardData) => card.rarity === 4
export const hasMonsterBanner = (card: CardData) => card.color === 11
export const hasNoBanner = (card: CardData) => card.color === 0
export const isAnimalCompanionCard = (card: CardData) => card.name.endsWith('(Companion)')

/*
 * Tracked cards are saved as names, so a card sharing its name with another is saved as
 * `name#id` instead. Saved progress for every other card keeps its existing format.
 */
const STRIKE_KEY_ID_SEPARATOR = '#'

export const getCardStrikeKey = (card: CardData) =>
  card.hasDuplicateName ? `${card.name}${STRIKE_KEY_ID_SEPARATOR}${card.blightbane_id}` : card.name

export const getCardNameFromStrikeKey = (key: string) => key.split(STRIKE_KEY_ID_SEPARATOR)[0]

// A bare name saved before same-named cards were shown still marks all of them as tracked
export const isCardStruckIn = (struckKeys: Set<string>, card: CardData) =>
  struckKeys.has(getCardStrikeKey(card)) || (card.hasDuplicateName && struckKeys.has(card.name))

export const containsNonCollectible = (cards: CardData[]) =>
  cards.some((card) => isNonCollectible(card))

export const containsAnimalCompanionCard = (cards: CardData[]) =>
  cards.some((card) => isAnimalCompanionCard(card))
