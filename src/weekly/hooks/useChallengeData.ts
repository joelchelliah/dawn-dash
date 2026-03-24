import { useState, useEffect } from 'react'

import { ChallengeData } from '@/codex/types/challenges'
import { fetchLatestChallengeData } from '@/codex/services/challengesApiBlightbane'

interface UseChallengeDataReturn {
  challengeData: ChallengeData | null
  isLoading: boolean
  isError: boolean
}

export function useChallengeData(): UseChallengeDataReturn {
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null)
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
    isError,
  }
}
