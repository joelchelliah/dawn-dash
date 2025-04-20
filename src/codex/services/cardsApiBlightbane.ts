import { handleError } from '../../shared/utils/apiErrorHandling'
import { CardApiResponse, CardData, CardsApiResponse } from '../types/cards'

const BLIGHTBANE_URL = 'https://blightbane.io/api'
const PROGRESS_INTERVAL = 100
const PROGRESS_INCREMENT_3x = 9
const PROGRESS_INCREMENT_2x = 6
const PROGRESS_INCREMENT_1x = 3

export const fetchCards = async (onProgress: (progress: number) => void): Promise<CardData[]> => {
  let currentProgress = 5
  onProgress(currentProgress)

  const options = 'search=&rarity=&category=&type=&banner=&exp='
  const url = `${BLIGHTBANE_URL}/cards-codex?${options}`

  try {
    const progressTimer = setInterval(() => {
      if (currentProgress < 95) {
        if (currentProgress < 40) currentProgress += PROGRESS_INCREMENT_3x
        if (currentProgress < 60) currentProgress += PROGRESS_INCREMENT_2x
        currentProgress += PROGRESS_INCREMENT_1x
        onProgress(currentProgress)
      }
    }, PROGRESS_INTERVAL)

    const response = await fetch(url)
    clearInterval(progressTimer)

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const data: CardsApiResponse = await response.json()
    const { card_len, cards } = data

    if (card_len === 0) {
      throw new Error(`No cards returned from Blightbane!`)
    }

    onProgress(95)

    const sortedUniqueCards = cards
      .map((card) => ({
        ...card,
        blightbane_id: card.id,
        expansion: getActualExpansion(card),
      }))
      .sort((a, b) => {
        if (a.color !== b.color) return a.color - b.color
        if (a.rarity !== b.rarity) return b.rarity - a.rarity

        return a.name.localeCompare(b.name)
      })
      .filter((card, index, self) => index === self.findIndex(({ name }) => name === card.name))

    onProgress(100) // Processing complete
    return sortedUniqueCards
  } catch (error) {
    handleError(error, 'Error fetching cards from Blightbane')
    return []
  }
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

/*
 * Better mapping of card expansions so that they make more sense in the search results.
 * This is needed because a lot of conjured or non-collectible cards seem to be placed in the
 * monster expansion (0).
 */
const getActualExpansion = (card: CardApiResponse): number => {
  if (ACTUALLY_CORE_CARDS.includes(card.name)) return 1
  if (ACTUALLY_ECLYPSE_CARDS.includes(card.name)) return 7

  return card.expansion
}
