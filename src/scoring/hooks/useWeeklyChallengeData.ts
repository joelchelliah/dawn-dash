import { useState, useEffect } from 'react'

import { fetchLatestChallenge } from '@/shared/services/challengesApiBlightbane'
import { ChallengeApiResponse } from '@/shared/types/challengeApi'

import { WeeklyChallengeData } from '../types'

const toWeeklyChallengeData = (
  challenge: ChallengeApiResponse['challenge']
): WeeklyChallengeData => {
  const scoring = challenge.scoringParams

  return {
    from: challenge.from,
    image: challenge.image,
    intro: challenge.intro,
    name: challenge.name,
    notes: challenge.notes,
    scoring: {
      accuracyBaseValue: scoring.accuracyBaseValue,
      allowNegativeAccuracy: scoring.allowNegativeAccuracy,
      buffer: scoring.buffer,
      calculationType: scoring.calculationType,
      cardBaseValue: scoring.cardBaseValue,
      keywords: scoring.keywords,
      lowestXAmount: scoring.lowestXAmount,
      diminishingReturnsLimit: scoring.maxNumberOfCopiesForDiminishingReturns,
      fixedValueScoring: scoring.miscPointsRules.map((rule) => ({
        action: rule.action,
        keyword: rule.keyword,
        pointValue: rule.pointValue,
        pointLimit: rule.pointLimit,
      })),
      target: scoring.target,
    },
    isInvalid: challenge.isTest || !challenge.show,
    to: challenge.to,
    uid: challenge.uid,
  }
}

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

        const data = toWeeklyChallengeData(await fetchLatestChallenge())

        if (isMounted) {
          if (data) {
            setChallengeData(data)
          } else {
            setIsError(true)
          }
        }
      } catch {
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
