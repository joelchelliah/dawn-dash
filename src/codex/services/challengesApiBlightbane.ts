import { handleError } from '@/shared/utils/apiErrorHandling'
import { isNotNullOrUndefined } from '@/shared/utils/object'
import { CharacterClass } from '@/shared/types/characterClass'

import {
  AllChallengesApiResponse,
  ChallengeApiResponse,
  ChallengeData,
} from '@/codex/types/challenges'

import { Banner, CardSet } from '../types/filters'

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
      additionalCards = [],
      additionalTalents = [],
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
    const hasAccessToAllColors = isBoundless || isDeckedOut

    const banners = hasAccessToAllColors
      ? new Set([Banner.All])
      : getBanners(allSetups, additionalCards, additionalTalents)

    const cardSets = isBoundless ? new Set([CardSet.All]) : getCardSets(expansions)

    return {
      id: latestChallengeId,
      name,
      keywords: new Set(scoringParams.keywords),
      specialKeywords: new Set(
        scoringParams.miscPointsRules
          .filter((rule) => rule.action === 'DeckContainsCard')
          .map((rule) => rule.keyword)
      ),
      banners,
      cardSets: new Set(cardSets as CardSet[]),
    }
  } catch (error) {
    handleError(error, 'Error fetching latest challenge from Blightbane')
    return null
  }
}

// -------------------- Helper Functions --------------------

const getBanners = (
  allSetups: Array<{ class: string; weapon: string; power: string; card: string }>,
  additionalCards: string[],
  additionalTalents: string[]
): Set<Banner> => {
  const isHolyTalent = (talent: string) =>
    [
      // Regular Talents
      'devotion',
      'doctrine',
      'faithbound',
      'gather following',
      'initiation',
      'righteous charge',
      // Weapon Powers
      'angelic weapon',
      'devout weapon',
      'holy weapon',
      'vengeful weapon',
      'zealous weapon',
    ].some((it) => talent.toLowerCase().includes(it))

  const allClasses = new Set(allSetups.map((setup) => setup.class))

  const dexCard = "rogue's locket"
  const includeGreenBanner =
    allClasses.has(CharacterClass.Rogue) ||
    allClasses.has(CharacterClass.Hunter) ||
    allClasses.has(CharacterClass.Seeker) ||
    additionalCards.some((card) => card.toLowerCase().includes(dexCard)) ||
    (allSetups.length > 0 && allSetups.some(({ card }) => card.toLowerCase().includes(dexCard)))

  const intCard = "arcanist's locket"
  const includeBlueBanner =
    allClasses.has(CharacterClass.Arcanist) ||
    allClasses.has(CharacterClass.Knight) ||
    allClasses.has(CharacterClass.Seeker) ||
    additionalCards.some((card) => card.toLowerCase().includes(intCard)) ||
    (allSetups.length > 0 && allSetups.some(({ card }) => card.toLowerCase().includes(intCard)))

  const strCard = "warrior's locket"
  const includeRedBanner =
    allClasses.has(CharacterClass.Warrior) ||
    allClasses.has(CharacterClass.Knight) ||
    allClasses.has(CharacterClass.Hunter) ||
    additionalCards.some((card) => card.toLowerCase().includes(strCard)) ||
    (allSetups.length > 0 && allSetups.some(({ card }) => card.toLowerCase().includes(strCard)))

  const holyCard = 'divine focus'
  const includeGoldBanner =
    additionalTalents.some(isHolyTalent) ||
    (allSetups.length > 0 && allSetups.every(({ power }) => isHolyTalent(power))) ||
    additionalCards.some((card) => card.toLowerCase().includes(holyCard)) ||
    (allSetups.length > 0 && allSetups.some(({ card }) => card.toLowerCase().includes(holyCard)))

  const includePurpleBanner = allClasses.has(CharacterClass.Knight)
  const includeAquaBanner = allClasses.has(CharacterClass.Seeker)
  const includeOrangeBanner = allClasses.has(CharacterClass.Hunter)

  return new Set([
    Banner.Brown,
    Banner.Black,
    ...(includeGreenBanner ? [Banner.Green] : []),
    ...(includeBlueBanner ? [Banner.Blue] : []),
    ...(includeRedBanner ? [Banner.Red] : []),
    ...(includePurpleBanner ? [Banner.Purple] : []),
    ...(includeAquaBanner ? [Banner.Aqua] : []),
    ...(includeOrangeBanner ? [Banner.Orange] : []),
    ...(includeGoldBanner ? [Banner.Gold] : []),
  ])
}

const getCardSets = (expansions: string[]): CardSet[] =>
  Array.from(expansions)
    .map((expansion) => {
      switch (expansion.toLowerCase()) {
        case 'core':
          return CardSet.Core
        case 'progression':
          return CardSet.Metaprogress
        case 'metamorphosis':
          return CardSet.Metamorphosis
        case 'core extended':
          return CardSet.Core
        case 'infinitum':
          return CardSet.Infinitum
        case 'catalyst':
          return CardSet.Catalyst
        case 'eclypse':
          return CardSet.Eclypse
        case 'synthesis':
          return CardSet.Synthesis
        default:
          return null
      }
    })
    .filter(isNotNullOrUndefined)
