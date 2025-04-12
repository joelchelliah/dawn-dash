import {
  supabase,
  SUPABASE_MAX_PAGE_SIZE,
  SUPABASE_TABLE_CARDS,
} from '../../shared/config/supabase'
import { handleError } from '../../shared/utils/apiErrorHandling'
import { CardData } from '../types/cards'

export const fetchCards = async (onProgress: (progress: number) => void): Promise<CardData[]> => {
  try {
    onProgress(10)

    let allCards: CardData[] = []
    let hasMore = true
    let offset = 0

    while (hasMore) {
      const {
        data: cards,
        error,
        count,
      } = await supabase
        .from(SUPABASE_TABLE_CARDS)
        .select('*', { count: 'exact' })
        .range(offset, offset + SUPABASE_MAX_PAGE_SIZE - 1)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (!cards) {
        console.warn('No cards returned from Supabase')
        return []
      }

      allCards = [...allCards, ...cards]
      offset += SUPABASE_MAX_PAGE_SIZE
      hasMore = cards.length === SUPABASE_MAX_PAGE_SIZE

      const progress = Math.floor(Math.min(15 + (offset / (count || 1)) * 85, 100))
      onProgress(progress)
    }

    const sortedUniqueCards = allCards
      .sort((a, b) => {
        if (a.color !== b.color) return a.color - b.color
        if (a.rarity !== b.rarity) return b.rarity - a.rarity

        return a.name.localeCompare(b.name)
      })
      .filter((card, index, self) => index === self.findIndex(({ name }) => name === card.name))

    onProgress(100)
    return sortedUniqueCards
  } catch (error) {
    handleError(error, 'Error fetching cards from Supabase')
    throw error
  }
}
