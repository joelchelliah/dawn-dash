import axios, { isAxiosError } from 'axios'

import { CardData, CardsApiResponse } from '../types/cards'
import {
  Difficulty,
  SpeedRunApiResponse,
  SpeedRunCategory,
  SpeedRunClass,
  SpeedRunData,
  SpeedRunSubclass,
} from '../types/speedRun'
import { parseVersion } from '../utils/version'

const BASE_URL = 'https://blightbane.io/api'

export const fetchSpeedruns = async (
  type: SpeedRunClass,
  difficulty: Difficulty,
  num: number
): Promise<SpeedRunData[]> => {
  const classParam = type === SpeedRunClass.Sunforge ? 'Scion' : type
  const url = `${BASE_URL}/speedruns?diff=${difficulty}&class=${classParam}&top=${num}&options=&nolimit=true`

  try {
    const response = await axios.get<[SpeedRunApiResponse]>(url)

    if (!response.data?.[0]) {
      console.error('Invalid API response structure:', response.data)
      return []
    }

    const category = Object.keys(response.data[0])[0] as SpeedRunCategory
    return response.data[0][category]
      .filter((run) => !!run.version) // Ignore runs with no version
      .map((run) => ({
        id: run._id,
        uid: run.uid,
        version: parseVersion(run.version),
        duration: run.stats?.clock1,
        discorduser: run.discorduser || null,
        subclass: run.subclass as SpeedRunSubclass,
      }))
  } catch (error) {
    handleError(error, 'Error fetching speedruns')
    throw error
  }
}

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

function handleError(error: unknown, msg: string) {
  if (isAxiosError(error)) {
    console.error(msg ?? 'API request failed:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    })
  }
}
