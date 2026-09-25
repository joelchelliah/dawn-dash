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

// `hasDuplicateName` is derived here, over the whole deduplicated list
type UnsortedCard = Omit<CardData, 'hasDuplicateName'>

/*
 * Different cards can share a name (e.g. the low/high-tide Whirlpools, or two monsters' Consume), so
 * only a card identical in every displayed field is a duplicate. Those do exist: Divinity and Marked
 * each come back twice under different ids.
 */
const getDuplicateKey = ({
  name,
  description,
  rarity,
  type,
  category,
  expansion,
  color,
}: UnsortedCard) => JSON.stringify([name, description, rarity, type, category, expansion, color])

const sortAndRemoveDuplicates = (cards: UnsortedCard[]): CardData[] => {
  const seenKeys = new Set<string>()
  const uniqueCards = cards
    .sort((a, b) => {
      if (a.color !== b.color) return a.color - b.color

      const rarityRankDiff = getRarityRank(b.rarity) - getRarityRank(a.rarity)
      if (rarityRankDiff !== 0) return rarityRankDiff

      const nameDiff = a.name.localeCompare(b.name)
      if (nameDiff !== 0) return nameDiff

      // Keeps same-named cards in a stable order, whatever order the API returns them in
      return a.blightbane_id - b.blightbane_id
    })
    .filter((card) => {
      const key = getDuplicateKey(card)
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

  const nameCounts = new Map<string, number>()
  uniqueCards.forEach(({ name }) => nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1))

  return uniqueCards.map((card) => ({
    ...card,
    hasDuplicateName: (nameCounts.get(card.name) ?? 0) > 1,
  }))
}

const removeDeprecatedCards = <T extends CardApiResponse | CardData>(cards: T[]): T[] =>
  cards.filter((card) => !DEPRECATED_CARDS.includes(card.name))

const getActualColor = (card: CardApiResponse): number => {
  // Blightbane shows it as monster banner, but game treats it as black banner.
  // Showing as black banner here to match the game's treatment.
  if (card.name === 'Infernal Racket') return 9

  return card.color
}

const DEPRECATED_CARDS = ['Cutlass_OLD', 'Plated Maul', 'Battle Axe']
