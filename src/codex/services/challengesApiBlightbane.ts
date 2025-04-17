import { handleError } from '../../shared/utils/apiErrorHandling'
import { AllChallengesApiResponse, ChallengeApiResponse, ChallengeData } from '../types/challenges'

const BLIGHTBANE_URL = 'https://blightbane.io/api'

export const fetchLatestChallengeData = async (): Promise<ChallengeData | null> => {
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

    const {
      challenge: { name, scoringParams, expansions, setups, affixes },
    }: ChallengeApiResponse = await latestChallengeResponse.json()

    const isBoundlessSpoils = (affix: string) =>
      affix.toLowerCase().includes('boundless spoils'.toLowerCase())

    return {
      name,
      keywords: new Set(scoringParams.keywords),
      specialKeywords: new Set(
        scoringParams.miscPointsRules
          .filter((rule) => rule.action === 'DeckContainsCard')
          .map((rule) => rule.keyword)
      ),
      expansions: new Set(expansions),
      classes: new Set(setups.map((setup) => setup.class)),
      isBoundless: affixes.some(isBoundlessSpoils),
    }
  } catch (error) {
    handleError(error, 'Error fetching latest challenge from Blightbane')
    return null
  }
}
