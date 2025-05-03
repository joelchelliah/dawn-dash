import { CardApiResponse, CardData } from '../types/cards'

// When using cards data from Blightbane API
export const mapAndSortCardsResponse = (cards: CardApiResponse[]): CardData[] =>
  sortAndRemoveDuplicates(
    cards.map((card) => ({
      ...card,
      blightbane_id: card.id,
      expansion: getActualExpansion(card),
    }))
  )

// When using cards data from Supabase
export const mapAndSortCardsData = (cards: CardData[]) =>
  sortAndRemoveDuplicates(
    cards.map((card) => ({
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

/*
 * Better mapping of card expansions so that they make more sense in the search results.
 * This is needed because a lot of conjured or non-collectible cards seem to be placed in the
 * monster expansion (0).
 */
const getActualExpansion = (card: CardApiResponse | CardData): number => {
  if (ACTUALLY_CORE_CARDS.includes(card.name)) return 1
  if (ACTUALLY_ECLYPSE_CARDS.includes(card.name)) return 7

  return card.expansion
}

const ACTUALLY_CORE_CARDS = ['Elite Prayer', 'Monolith']
const ACTUALLY_ECLYPSE_CARDS = [
  'Battlespear C',
  'Battlespear D',
  'Battlespear E',
  'Battlespear H',
  'Battlespear L',
  'Battlespear U',
]
