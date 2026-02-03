import { Banner, CardSet } from './filters'

export type ChallengeData = {
  id: number
  name: string
  keywords: Set<string>
  specialKeywords: Set<string>
  cardSets: Set<CardSet>
  banners: Set<Banner>
}

export type ChallengeApiResponse = {
  challenge: {
    scoringParams: {
      accuracyBaseValue: number
      card: string
      class: string
      classes: string[]
      power: string
      weapon: string
      target: number
      buffer: number
      cardBaseValue: number
      maxNumberOfCopiesForDiminishingReturns: number
      allowNegativeAccuracy: boolean
      calculationType: string
      lowestXAmount: number
      keywords: string[]
      miscPointsRules: {
        action: string
        keyword: string
        pointValue: number
        pointLimit: number
        _id: string
      }[]
    }
    _id: string
    bosses: string[]
    maps: string[]
    expansions: string[]
    classes: string[]
    setups: {
      class: string
      weapon: string
      power: string
      card: string
    }[]
    affixes: string[]
    additionalCards?: string[]
    additionalTalents?: string[]
    winners: string[]
    uid: number
    class: string
    weapon: string
    power: string
    card: string
    show: boolean
    flags: string
    name: string
    intro: string
    image: string
    version: string
    from: string
    to: string
    notes: string
    __v: number
    threadid: string
  }
  decks: number
}

export type AllChallengesApiResponse = {
  challenges: Array<{
    _id: number
    uid: number
  }>
}
