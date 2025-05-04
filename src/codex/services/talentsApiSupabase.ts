import { mapAndSortTalentsData } from '../utils/talentsResponseMapper'
import {
  supabase,
  SUPABASE_MAX_PAGE_SIZE,
  SUPABASE_TABLE_TALENTS,
} from '../../shared/config/supabase'
import { handleError } from '../../shared/utils/apiErrorHandling'
import { ParsedTalentData, TalentData } from '../types/talents'

export const fetchTalents = async (
  onProgress: (progress: number) => void
): Promise<ParsedTalentData[]> => {
  try {
    onProgress(10)

    let allTalents: TalentData[] = []
    let hasMore = true
    let offset = 0

    while (hasMore) {
      const {
        data: talents,
        error,
        count,
      } = await supabase
        .from(SUPABASE_TABLE_TALENTS)
        .select('*', { count: 'exact' })
        .range(offset, offset + SUPABASE_MAX_PAGE_SIZE - 1)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (!talents) {
        console.warn('No talents returned from Supabase')
        return []
      }

      allTalents = [...allTalents, ...talents]
      offset += SUPABASE_MAX_PAGE_SIZE
      hasMore = talents.length === SUPABASE_MAX_PAGE_SIZE

      const progress = Math.floor(Math.min(15 + (offset / (count || 1)) * 85, 95))
      onProgress(progress)
    }

    const sortedUniqueTalents = mapAndSortTalentsData(allTalents)

    onProgress(100)
    return sortedUniqueTalents
  } catch (error) {
    handleError(error, 'Error fetching talents from Supabase')
    throw error
  }
}
