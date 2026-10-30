import { handleError } from '@/shared/utils/apiErrorHandling'
import { AllChallengesApiResponse, ChallengeApiResponse } from '@/shared/types/challengeApi'

const BLIGHTBANE_URL = 'https://blightbane.io/api'

/**
 * The raw latest weekly challenge. Cardex and Scoring each map it to their own shape.
 */
export const fetchLatestChallenge = async (): Promise<ChallengeApiResponse['challenge']> => {
  try {
    const response = await fetch(`${BLIGHTBANE_URL}/allchallenges`)

    if (!response.ok) {
      throw new Error(`HTTP error when fetching all challenges: ${response.status}`)
    }

    const allChallenges: AllChallengesApiResponse = await response.json()
    const latestChallengeId = allChallenges.challenges[0].uid

    // For debugging:
    // const latestChallengeId = 1776366000000

    const latestChallengeResponse = await fetch(`${BLIGHTBANE_URL}/challenge/${latestChallengeId}`)

    if (!latestChallengeResponse.ok) {
      throw new Error(
        `HTTP error when fetching latest challenge: ${latestChallengeResponse.status}`
      )
    }

    const { challenge }: ChallengeApiResponse = await latestChallengeResponse.json()

    return challenge
  } catch (error) {
    handleError(error, 'Error fetching latest challenge from Blightbane')
    throw error
  }
}
