import { useState, useEffect } from 'react'

import { fetchLatestChallengeData } from '@/scoring/services/weeklyChallengeDataApi'

import { WeeklyChallengeData } from '../types'

interface UseWeeklyChallengeData {
  challengeData: WeeklyChallengeData | null
  isLoading: boolean
  isError: boolean
}

export function useWeeklyChallengeData(): UseWeeklyChallengeData {
  const [challengeData, setChallengeData] = useState<WeeklyChallengeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadChallengeData = async () => {
      try {
        setIsLoading(true)
        setIsError(false)

        const data = await fetchLatestChallengeData()

        if (isMounted) {
          if (data) {
            setChallengeData(data)
          } else {
            setIsError(true)
          }
        }
      } catch (error) {
        if (isMounted) {
          setIsError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadChallengeData()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    challengeData,
    isLoading,
    isError: !isLoading && (isError || !challengeData || challengeData.isInvalid),
  }
}
