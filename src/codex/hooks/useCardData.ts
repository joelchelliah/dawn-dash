import { useEffect, useMemo, useState } from 'react'

import useSWR from 'swr'

import { isNotNullOrEmpty } from '@/shared/utils/lists'
import { logger } from '@/shared/utils/logger'

import { fetchCards } from '@/codex/services/cardsApiBlightbane'
import { CardData } from '@/codex/types/cards'
import {
  cacheCardData,
  getCachedCardData,
  getCachedCardDataTimestamp,
} from '@/codex/utils/codexCardsStore'

export interface UseCardData {
  cardData: CardData[] | undefined
  isLoading: boolean
  isLoadingInBackground: boolean
  isError: boolean
  isErrorInBackground: boolean
  lastUpdated: number | null
  refresh: () => void
  progress: number
}

export function useCardData(): UseCardData {
  const [localData, setLocalData] = useState<CardData[] | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const { data, isStale } = getCachedCardData()
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
        const cacheResult = cacheCardData(newData)
        if (cacheResult.success) {
          setIsRefreshing(false)
        } else {
          logger.error('Failed to cache card data:', cacheResult.error)
        }
        setProgress(100)
      },
      onError: (fetchError) => {
        logger.error('Error fetching card data:', fetchError)
      },
    }
  )

  /*
   * `localData` is the invalidation signal: it changes identity exactly when
   * `onSuccess` has written a new cache entry, which is the only thing that moves the timestamp.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lastUpdated = useMemo(() => getCachedCardDataTimestamp(), [localData])

  return {
    cardData: localData || data,
    isLoading: (isLoading || isRefreshing) && !localData && !error,
    isLoadingInBackground: Boolean((isLoading || isRefreshing) && localData && !error),
    isError: error && !localData,
    isErrorInBackground: Boolean(error && localData),
    lastUpdated,
    refresh: () => {
      setProgress(0)
      setIsRefreshing(true)
    },
    progress,
  }
}
