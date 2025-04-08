import axios from 'axios'

import { handleError } from '../../shared/utils/apiErrorHandling'
import { CardData, CardsApiResponse } from '../types/cards'

const BASE_URL = 'https://blightbane.io/api'

export const fetchCards = async (onProgress: (progress: number) => void): Promise<CardData[]> => {
  const numExpansions = 8
  const numBanners = 12
  const aggregatedCards = []
  const totalRequests = numExpansions * numBanners - 1 // TODO: remove -1 after fixing Monster cards request
  let completedRequests = 0

  for (let exp = 0; exp < numExpansions; exp++) {
    for (let banner = 0; banner < numBanners; banner++) {
      // Too many monster cards. SKIPPING...
      if (exp == 0 && banner == 11) continue

      const url = `${BASE_URL}/cards?search=&rarity=&category=&type=&banner=${banner}&exp=${exp}`
      try {
        const response = await axios.get<CardsApiResponse>(url)
        const { card_len, cards } = response.data

        if (card_len > 100) {
          throw new Error(`Too many cards! Banner: ${banner}, Exp: ${exp}`)
        }

        const output = cards.map((card) => ({
          name: card.name,
          description: card.description,
          rarity: card.rarity,
          type: card.type,
          category: card.category,
          expansion: card.expansion,
          color: card.color,
        }))

        aggregatedCards.push(...output)

        completedRequests++
        const currentProgress = Math.floor((completedRequests / totalRequests) * 100)
        onProgress(currentProgress)
      } catch (error) {
        handleError(error, `Error fetching cards for banner: ${banner}, exp: ${exp}`)
        throw error
      }
    }
  }

  return aggregatedCards
}
