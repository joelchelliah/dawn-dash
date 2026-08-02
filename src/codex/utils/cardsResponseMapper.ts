import { CardApiResponse, CardData } from '@/codex/types/cards'

// When using cards data from Blightbane API
export const mapAndSortCardsResponse = (cards: CardApiResponse[]): CardData[] =>
  sortAndRemoveDuplicates(
    removeDeprecatedCards(cards).map((card) => ({
      ...card,
      blightbane_id: card.id,
      color: getActualColor(card),
    }))
  )

// When using cards data from Supabase
export const mapAndSortCardsData = (cards: CardData[]) =>
  sortAndRemoveDuplicates(removeDeprecatedCards(cards))

// Rarity 4 (Monster) is numerically the highest but is the *lowest* actual rarity, so sorting
// on the raw value floats monster cards above legendaries in the monster banner.
const getRarityRank = (rarity: number): number => (rarity === 4 ? -1 : rarity)

const sortAndRemoveDuplicates = (cards: CardData[]) =>
  cards
    .sort((a, b) => {
      if (a.color !== b.color) return a.color - b.color

      const rarityRankDiff = getRarityRank(b.rarity) - getRarityRank(a.rarity)
      if (rarityRankDiff !== 0) return rarityRankDiff

      return a.name.localeCompare(b.name)
    })
    .filter((card, index, self) => index === self.findIndex(({ name }) => name === card.name))

const removeDeprecatedCards = <T extends CardApiResponse | CardData>(cards: T[]): T[] =>
  cards.filter((card) => !DEPRECATED_CARDS.includes(card.name))

const getActualColor = (card: CardApiResponse): number => {
  // Blightbane shows it as monster banner, but game treats it as black banner.
  // Showing as black banner here to match the game's treatment.
  if (card.name === 'Infernal Racket') return 9

  return card.color
}

const DEPRECATED_CARDS = ['Cutlass_OLD', 'Plated Maul', 'Battle Axe']
