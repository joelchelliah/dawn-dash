import useSWR from 'swr'

import { fetchLatestChallengeData } from '@/codex/services/challengesApiBlightbane'
import { ChallengeData } from '@/codex/types/challenges'
import { WeeklyChallengeFilterData } from '@/codex/types/filters'

export function useWeeklyChallengeFilterData() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ChallengeData | null>(
    'weekly-challenge-filter-data',
    fetchLatestChallengeData
  )

  const filterData: WeeklyChallengeFilterData | null = data
    ? {
        id: data.id,
        name: data.name,
        keywords: data.keywords,
        specialKeywords: data.specialKeywords,
        cardSets: data.cardSets,
        banners: data.banners,
      }
    : null

  return {
    filterData,
    isFilterDataError: error,
    isFilterDataValidating: isValidating,
    isFilterDataLoading: isLoading,
    refreshFilterData: () => mutate(),
  }
}
