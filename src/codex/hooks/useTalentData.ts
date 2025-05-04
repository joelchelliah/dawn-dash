import { useEffect, useState } from 'react'

import useSWR from 'swr'

import { fetchTalents } from '../services/talentsApiSupabase'
import {
  getCachedTalentDataTimestamp,
  getCachedTalentData,
  cacheTalentData,
} from '../utils/codexTalentsStore'
import { isNotNullOrEmpty } from '../../shared/utils/lists'
import { ParsedTalentData } from '../types/talents'

export interface UseTalentData {
  talentData: ParsedTalentData[] | undefined
  isLoading: boolean
  isLoadingInBackground: boolean
  isError: boolean
  isErrorInBackground: boolean
  lastUpdated: number | null
  refresh: () => void
  progress: number
}

export function useTalentData(): UseTalentData {
  const [localData, setLocalData] = useState<ParsedTalentData[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const { data, isStale } = getCachedTalentData()
    if (isNotNullOrEmpty(data)) {
      setLocalData(data)
      setIsRefreshing(isStale)
    } else {
      setIsRefreshing(true)
    }
  }, [])

  const { data, error, isLoading } = useSWR<ParsedTalentData[]>(
    isRefreshing ? ['talents'] : null,
    () => fetchTalents(setProgress),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      onSuccess: (newData) => {
        setLocalData(newData)
        cacheTalentData(newData)
        setIsRefreshing(false)
        setProgress(100)
      },
    }
  )

  return {
    talentData: localData || data,
    isLoading: (isLoading || isRefreshing) && !localData,
    isLoadingInBackground: Boolean((isLoading || isRefreshing) && localData),
    isError: error && !localData,
    isErrorInBackground: Boolean(error && localData),
    lastUpdated: getCachedTalentDataTimestamp(),
    refresh: () => {
      setProgress(0)
      setIsRefreshing(true)
    },
    progress,
  }
}
