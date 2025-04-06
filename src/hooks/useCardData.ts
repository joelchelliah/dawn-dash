import { useEffect, useState } from 'react'

import useSWR from 'swr'

import { fetchCards } from '../services/blightbaneApi'
import { CardData } from '../types/cards'
import { getFromCache, saveToCache } from '../utils/storage'

export function useCardData() {
  const [localData, setLocalData] = useState<CardData[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Check cache and update state
    const { data, isStale } = getFromCache<CardData[]>('cards')
    if (data) {
      setLocalData(data)
      setIsRefreshing(isStale)
    } else {
      setIsRefreshing(true)
    }
  }, [])

  const { data, error, isLoading } = useSWR<CardData[]>(
    isRefreshing ? ['cards'] : null,
    () => fetchCards(setProgress),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      onSuccess: (newData) => {
        setLocalData(newData)
        saveToCache('cards', newData)
        setIsRefreshing(false)
        setProgress(100) // Ensure progress is complete
      },
    }
  )

  return {
    cardData: localData || data,
    isLoading: (isLoading || isRefreshing) && !localData,
    isLoadingInBackground: Boolean((isLoading || isRefreshing) && localData),
    isError: error && !localData,
    isErrorInBackground: Boolean(error && localData),
    lastUpdated: getFromCache<CardData[]>('cards').timestamp,
    refresh: () => {
      setProgress(0)
      setIsRefreshing(true)
    },
    progress,
  }
}
