import { handleError } from '@/shared/utils/apiErrorHandling'
import { AllChallengesApiResponse, ChallengeApiResponse } from '@/shared/types/challengeApi'

import { WeeklyChallengeData } from '../types'

const BLIGHTBANE_URL = 'https://blightbane.io/api'

export const fetchLatestChallengeData = async (): Promise<WeeklyChallengeData | null> => {
  try {
    const response = await fetch(`${BLIGHTBANE_URL}/allchallenges`)

    if (!response.ok) {
      throw new Error(`HTTP error when fetching all challenges: ${response.status}`)
    }

    const allChallenges: AllChallengesApiResponse = await response.json()
    const latestChallengeId = allChallenges.challenges[0].uid

    const latestChallengeResponse = await fetch(`${BLIGHTBANE_URL}/challenge/${latestChallengeId}`)

    if (!latestChallengeResponse.ok) {
      throw new Error(
        `HTTP error when fetching latest challenge: ${latestChallengeResponse.status}`
      )
    }

    const { challenge }: ChallengeApiResponse = await latestChallengeResponse.json()
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
  } catch (error) {
    handleError(error, 'Error fetching latest challenge from Blightbane')
    return null
  }
}
