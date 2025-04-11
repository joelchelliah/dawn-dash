import { useEffect, useState, useRef } from 'react'

import useSWR from 'swr'

import { getFromCache, saveToCache } from '../../shared/utils/storage'
import { fetchSpeedruns } from '../services/speedrunsApi'
import { Difficulty, SpeedRunClass, SpeedRunData } from '../types/speedRun'

const FETCH_DATA_SIZE = 50000

export function useSpeedrunData(type: SpeedRunClass, difficulty: Difficulty) {
  const [localData, setLocalData] = useState<SpeedRunData[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const cacheKey = `${type}-${difficulty}`

  // To prevent resetting data on initial mount
  const isInitialMount = useRef(true)

  // - To skip the useEffect if the cache key hasn't changed
  // - To ensure that we don't associate a request with the wrong cache key when fetching data
  const prevCacheKeyRef = useRef<string>(cacheKey)

  useEffect(() => {
    // Skip if nothing has changed
    if (prevCacheKeyRef.current === cacheKey && !isInitialMount.current) {
      return
    }

    // Always clear data on type/difficulty change, unless it's initial mount
    if (!isInitialMount.current) {
      setLocalData(null)
    }

    // Check cache and update state
    const { data, isStale } = getFromCache<SpeedRunData[]>('speedruns', cacheKey)
    if (data) {
      setLocalData(data)
      setIsRefreshing(isStale)
    } else {
      setIsRefreshing(true)
    }

    isInitialMount.current = false
    prevCacheKeyRef.current = cacheKey
  }, [type, difficulty, cacheKey])

  const { data, error, isLoading } = useSWR<SpeedRunData[]>(
    isRefreshing ? ['speedruns', 'manual', cacheKey] : null,
    () => fetchSpeedruns(type, difficulty, FETCH_DATA_SIZE),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      onSuccess: (newData) => {
        // Only update if this is still the active request
        if (prevCacheKeyRef.current === cacheKey) {
          setLocalData(newData)
          saveToCache('speedruns', newData, cacheKey)
          setIsRefreshing(false)
        }
      },
    }
  )

  return {
    speedrunData: localData || data,
    isLoading: (isLoading || isRefreshing) && !localData,
    isLoadingInBackground: Boolean((isLoading || isRefreshing) && localData),
    isError: error && !localData,
    lastUpdated: getFromCache<SpeedRunData[]>('speedruns', cacheKey).timestamp,
    refresh: () => setIsRefreshing(true),
  }
}
