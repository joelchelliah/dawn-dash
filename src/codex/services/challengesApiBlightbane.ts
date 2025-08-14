import { handleError } from '@/shared/utils/apiErrorHandling'

import {
  AllChallengesApiResponse,
  ChallengeApiResponse,
  ChallengeData,
} from '@/codex/types/challenges'

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
      challenge: { name, scoringParams, expansions, setups, affixes, additionalTalents },
    }: ChallengeApiResponse = await latestChallengeResponse.json()

    const isBoundless = affixes.some(
      (malignancy) => malignancy.toLowerCase() === 'boundless spoils'
    )
    const isDeckedOut = affixes.some((malignancy) => malignancy.toLowerCase() === 'decked out')

    const isHolyTalent = (talent: string) =>
      ['devotion', 'initiation', 'faithbound'].some((it) => talent.toLowerCase().includes(it))

    const isHolyWeaponPower = (power: string) =>
      ['holy weapon', 'devout weapon', 'zealous weapon', 'angelic weapon', 'vengeful weapon'].some(
        (it) => power.toLowerCase().includes(it)
      )

    return {
      id: latestChallengeId,
      name,
      keywords: new Set(scoringParams.keywords),
      specialKeywords: new Set(
        scoringParams.miscPointsRules
          .filter((rule) => rule.action === 'DeckContainsCard')
          .map((rule) => rule.keyword)
      ),
      expansions: new Set(expansions),
      classes: new Set(setups.map((setup) => setup.class)),
      isBoundless: isBoundless,
      hasAccessToAllColors: isBoundless || isDeckedOut,
      hasAccessToHoly:
        additionalTalents.some(isHolyTalent) ||
        setups.every(({ power }) => isHolyWeaponPower(power)),
    }
  } catch (error) {
    handleError(error, 'Error fetching latest challenge from Blightbane')
    return null
  }
}
