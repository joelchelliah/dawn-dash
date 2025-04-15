import { handleError } from '../../shared/utils/apiErrorHandling'
import { CardData, CardsApiResponse } from '../types/cards'

const BLIGHTBANE_URL = 'https://blightbane.io/api'
const PROGRESS_INTERVAL = 50
const PROGRESS_INCREMENT_FAST = 15
const PROGRESS_INCREMENT_SLOW = 1

export const fetchCards = async (onProgress: (progress: number) => void): Promise<CardData[]> => {
  let currentProgress = 5
  onProgress(currentProgress)

  const options = 'search=&rarity=&category=&type=&banner=&exp='
  const url = `${BLIGHTBANE_URL}/cards-codex?${options}`

  try {
    const progressTimer = setInterval(() => {
      if (currentProgress < 80) {
        currentProgress += currentProgress < 70 ? PROGRESS_INCREMENT_FAST : PROGRESS_INCREMENT_SLOW
        onProgress(currentProgress)
      }
    }, PROGRESS_INTERVAL)

    const response = await fetch(url)
    clearInterval(progressTimer)
    onProgress(80)

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const data: CardsApiResponse = await response.json()
    onProgress(85) // Data received
    const { card_len, cards } = data

    if (card_len === 0) {
      throw new Error(`No cards returned from Blightbane!`)
    }

    onProgress(90) // Starting data processing

    const sortedUniqueCards = cards
      .map((card) => ({
        ...card,
        blightbane_id: card.id,
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
