import { useCallback, useEffect, useState } from 'react'

import useSWR from 'swr'

import { fetchSpeedruns } from '../services/blightbaneApi'
import { SpeedRunData } from '../types/speedRun'
import { getFromCache, saveToCache } from '../utils/storage'

const FETCH_DATA_SIZE = 1000
const POLLING_INTERVAL = 10 * 60 * 1000

export function useSpeedrunData(type: string) {
  const [localData, setLocalData] = useState<SpeedRunData[] | null>(null)
  const [shouldFetch, setShouldFetch] = useState(false)

  const updateLocalDataAndCache = useCallback(
    (data: SpeedRunData[]) => {
      setLocalData(data)
      saveToCache(type, data)
    },
    [type]
  )

  useEffect(() => {
    const { data, isStale } = getFromCache<SpeedRunData[]>(type)
    if (data) {
      setLocalData(data)
      setShouldFetch(isStale)
    } else {
      setShouldFetch(true)
    }
  }, [type])

  // Polling, regardless of cache
  useSWR<SpeedRunData[]>(
    ['speedruns', type, 'polling'],
    () => fetchSpeedruns(type, FETCH_DATA_SIZE),
    {
      refreshInterval: POLLING_INTERVAL,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: updateLocalDataAndCache,
    }
  )

  // Manual fetch, only if cache is stale
  const { data, error, isLoading } = useSWR<SpeedRunData[]>(
    shouldFetch ? ['speedruns', type, 'manual'] : null,
    () => fetchSpeedruns(type, FETCH_DATA_SIZE),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      onSuccess: updateLocalDataAndCache,
    }
  )

  return {
    speedrunData: localData || data,
    isLoadingSpeedrunData: isLoading && !localData,
    isErrorSpeedrunData: error && !localData,
  }
}
