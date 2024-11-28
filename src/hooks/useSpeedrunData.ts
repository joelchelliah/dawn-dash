import { useEffect, useState } from 'react'

import useSWR from 'swr'

import { fetchSpeedruns } from '../services/blightbaneApi'
import { Difficulty, SpeedRunClass, SpeedRunData } from '../types/speedRun'
import { getFromCache, saveToCache } from '../utils/storage'

const FETCH_DATA_SIZE = 1000

export function useSpeedrunData(type: SpeedRunClass, difficulty: Difficulty) {
  const [localData, setLocalData] = useState<SpeedRunData[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const cacheKey = `${type}-${difficulty}`

  // Reset local data when type/difficulty changes
  useEffect(() => {
    setLocalData(null)
  }, [type, difficulty])

  useEffect(() => {
    const { data, isStale } = getFromCache<SpeedRunData[]>(cacheKey)
    if (data) {
      setLocalData(data)
      setIsRefreshing(isStale)
    } else {
      setIsRefreshing(true)
    }
  }, [cacheKey])

  const { data, error, isLoading } = useSWR<SpeedRunData[]>(
    isRefreshing ? ['speedruns', 'manual'] : null,
    () => fetchSpeedruns(type, difficulty, FETCH_DATA_SIZE),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      onSuccess: (newData) => {
        setLocalData(newData)
        saveToCache(cacheKey, newData)
        setIsRefreshing(false)
      },
    }
  )

  return {
    speedrunData: localData || data,
    isLoading: (isLoading || isRefreshing) && !localData,
    isLoadingInBackground: (isLoading || isRefreshing) && localData,
    isError: error && !localData,
    lastUpdated: getFromCache<SpeedRunData[]>(cacheKey).timestamp,
    refresh: () => setIsRefreshing(true),
  }
}
