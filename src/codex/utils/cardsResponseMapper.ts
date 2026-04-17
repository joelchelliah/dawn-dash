import { CardApiResponse, CardData } from '@/codex/types/cards'

// When using cards data from Blightbane API
export const mapAndSortCardsResponse = (cards: CardApiResponse[]): CardData[] =>
  sortAndRemoveDuplicates(
    removeDeprecatedCards(cards).map((card) => ({
      ...card,
      blightbane_id: card.id,
      expansion: getActualExpansion(card),
      color: getActualColor(card),
    }))
  )

// When using cards data from Supabase
export const mapAndSortCardsData = (cards: CardData[]) =>
  sortAndRemoveDuplicates(
    removeDeprecatedCards(cards).map((card) => ({
      ...card,
      expansion: getActualExpansion(card),
    }))
  )

const sortAndRemoveDuplicates = (cards: CardData[]) =>
  cards
    .sort((a, b) => {
      if (a.color !== b.color) return a.color - b.color
      if (a.rarity !== b.rarity) return b.rarity - a.rarity

      return a.name.localeCompare(b.name)
    })
    .filter((card, index, self) => index === self.findIndex(({ name }) => name === card.name))

const removeDeprecatedCards = <T extends CardApiResponse | CardData>(cards: T[]): T[] =>
  cards.filter((card) => !DEPRECATED_CARDS.includes(card.name))

/*
 * Better mapping of card expansions so that they make more sense in the search results.
 * This is needed because some conjured or non-collectible cards seem to be placed in
 * expansions that feel unintuitive.
 */
const getActualExpansion = (card: CardApiResponse | CardData): number => {
  if (ACTUALLY_MONSTER_CARDS.includes(card.name)) return 0
  if (ACTUALLY_CORE_CARDS.includes(card.name)) return 1
  if (ACTUALLY_ECLYPSE_CARDS.includes(card.name)) return 7
  if (ACTUALLY_SYNTHESIS_CARDS.includes(card.name)) return 8

  return card.expansion
}

const getActualColor = (card: CardApiResponse): number => {
  if (card.name === 'Infernal Racket') return 9 // Black banner

  return card.color
}

const ACTUALLY_CORE_CARDS = [
  'Elite Prayer',
  'Monolith',
  'Antimage Bomb',
  'Big Bomb',
  'Concussive Bomb',
  'Soulfire Bomb',
  'Cryo Bomb',
  'Pacified',
]
const ACTUALLY_ECLYPSE_CARDS = [
  'Battlespear C',
  'Battlespear D',
  'Battlespear E',
  'Battlespear H',
  'Battlespear L',
  'Battlespear U',
  'Map of Forms',
  'Map of Hues',
  'Map of Power',
  'Map of Riches',
  'Pirate Ink I',
  'Pirate Ink II',
  'Pirate Ink III',
  'Pirate Ink IV',
  'Pirate Ink V',
]
const ACTUALLY_SYNTHESIS_CARDS = ['Colonel', 'Lieutenant', 'Private', 'Sergeant']
const ACTUALLY_MONSTER_CARDS = ["Typhon's Cunning II", "Typhon's Cunning III"]

const DEPRECATED_CARDS = ['Cutlass_OLD']
