import { useEffect, useState, useRef } from 'react'

import useSWR from 'swr'

import { fetchSpeedruns } from '../services/blightbaneApi'
import { Difficulty, SpeedRunClass, SpeedRunData } from '../types/speedRun'
import { getFromCache, saveToCache } from '../utils/storage'

const FETCH_DATA_SIZE = 1000

export function useSpeedrunData(type: SpeedRunClass, difficulty: Difficulty) {
  const [localData, setLocalData] = useState<SpeedRunData[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const cacheKey = `${type}-${difficulty}`

  // To ensure that we don't associate a request with the wrong cache key
  // E.g. if we change the class/difficulty, while still waiting on a request
  const activeRequestRef = useRef<string>(cacheKey)

  // Reset local data when class/difficulty changes
  useEffect(() => {
    setLocalData(null)
    activeRequestRef.current = cacheKey
  }, [type, difficulty, cacheKey])

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
    isRefreshing ? ['speedruns', 'manual', cacheKey] : null,
    () => fetchSpeedruns(type, difficulty, FETCH_DATA_SIZE),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      onSuccess: (newData) => {
        // Only update if this is still the active request
        if (activeRequestRef.current === cacheKey) {
          setLocalData(newData)
          saveToCache(cacheKey, newData)
          setIsRefreshing(false)
        }
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
