import { useEffect, useState } from 'react'

import useSWR from 'swr'

import { isNotNullOrEmpty } from '../../shared/utils/lists'
import { getFromCache, saveToCache } from '../../shared/utils/storage'
import { fetchCards } from '../services/cardsApiBlightbane'
import { CardData } from '../types/cards'
export function useCardData() {
  const [localData, setLocalData] = useState<CardData[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const { data, isStale } = getFromCache<CardData[]>('cards')
    if (isNotNullOrEmpty(data)) {
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
        setProgress(100)
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
