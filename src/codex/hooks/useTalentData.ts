import { useEffect, useState } from 'react'

import useSWR from 'swr'

import { isNotNullOrUndefined } from '@/shared/utils/object'

import { fetchTalents } from '@/codex/services/talentsApiSupabase'
import {
  getCachedTalentTreeTimestamp,
  getCachedTalentTree,
  cacheTalentTree,
} from '@/codex/utils/codexTalentsStore'
import { TalentTree } from '@/codex/types/talents'

export interface UseTalentData {
  talentTree: TalentTree | undefined
  isLoading: boolean
  isLoadingInBackground: boolean
  isError: boolean
  isErrorInBackground: boolean
  lastUpdated: number | null
  refresh: () => void
  progress: number
}

export function useTalentData(): UseTalentData {
  const [localData, setLocalData] = useState<TalentTree | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const { data, isStale } = getCachedTalentTree()
    if (isNotNullOrUndefined(data)) {
      setLocalData(data)
      setIsRefreshing(isStale)
    } else {
      setIsRefreshing(true)
    }
  }, [])

  const { data, error, isLoading } = useSWR<TalentTree>(
    isRefreshing ? ['talents'] : null,
    () => fetchTalents(setProgress),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      onSuccess: (newData) => {
        setLocalData(newData)
        cacheTalentTree(newData)
        setIsRefreshing(false)
        setProgress(100)
      },
    }
  )

  return {
    talentTree: localData || data,
    isLoading: (isLoading || isRefreshing) && !localData,
    isLoadingInBackground: Boolean((isLoading || isRefreshing) && localData),
    isError: error && !localData,
    isErrorInBackground: Boolean(error && localData),
    lastUpdated: getCachedTalentTreeTimestamp(),
    refresh: () => {
      setProgress(0)
      setIsRefreshing(true)
    },
    progress,
  }
}
