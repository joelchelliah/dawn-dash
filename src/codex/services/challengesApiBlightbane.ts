import { handleError } from '@/shared/utils/apiErrorHandling'
import { isNotNullOrUndefined } from '@/shared/utils/object'

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

    const { challenge }: ChallengeApiResponse = await latestChallengeResponse.json()
    const {
      name,
      scoringParams,
      expansions,
      setups,
      affixes,
      additionalTalents,
      class: challengeClass,
      weapon: challengeWeapon,
      power: challengePower,
      card: challengeCard,
    } = challenge

    const isSingleSetupAvailable =
      isNotNullOrUndefined(challengeClass) &&
      isNotNullOrUndefined(challengeWeapon) &&
      isNotNullOrUndefined(challengePower) &&
      isNotNullOrUndefined(challengeCard)

    const allSetups = [
      isSingleSetupAvailable
        ? {
            class: challengeClass,
            weapon: challengeWeapon,
            power: challengePower,
            card: challengeCard,
          }
        : null,
      ...setups,
    ].filter(isNotNullOrUndefined)

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

    const hasAccessToHoly =
      additionalTalents.some(isHolyTalent) ||
      (allSetups.length > 0 && allSetups.every(({ power }) => isHolyWeaponPower(power)))

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
      classes: new Set(allSetups.map((setup) => setup.class)),
      isBoundless: isBoundless,
      hasAccessToAllColors: isBoundless || isDeckedOut,
      hasAccessToHoly,
    }
  } catch (error) {
    handleError(error, 'Error fetching latest challenge from Blightbane')
    return null
  }
}
