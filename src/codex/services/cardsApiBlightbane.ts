import { mapAndSortCardsResponse } from '../utils/cardsResponseMapper'
import { handleError } from '../../shared/utils/apiErrorHandling'
import { CardData, CardsApiResponse } from '../types/cards'

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

    const sortedUniqueCards = mapAndSortCardsResponse(cards)

    onProgress(100) // Processing complete
    return sortedUniqueCards
  } catch (error) {
    handleError(error, 'Error fetching cards from Blightbane')
    return []
  }
}
