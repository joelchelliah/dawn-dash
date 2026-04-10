export type AllChallengesApiResponse = {
  challenges: Array<{
    _id: number
    uid: number
  }>
}

export type ChallengeApiResponse = {
  challenge: {
    additionalCards?: string[]
    additionalTalents?: string[]
    affixes?: string[]
    bannedCards?: string[]
    bosses: string[]
    card: string
    class: string
    classes: string[]
    companion: string
    expansions: string[]
    flags: string
    from: string
    image: string
    imbues: string[]
    intro: string
    isTest: boolean
    maps: string[]
    name: string
    notes: string
    power: string
    scoringParams: ScoringParams
    setups: Setup[]
    show: boolean
    threadid: string
    to: string
    uid: number
    version: string
    weapon: string
    winners: string[]
    __v: number
    _id: string
  }
  decks: number
}

type ScoringParams = {
  accuracyBaseValue: number
  allowNegativeAccuracy: boolean
  buffer: number
  calculationType: string
  cardBaseValue: number
  keywords: string[]
  lowestXAmount: number
  maxNumberOfCopiesForDiminishingReturns: number
  miscPointsRules: MiscPointsRule[]
  target: number
}

type Setup = {
  class: string
  weapon: string
  power: string
  card: string
}

type MiscPointsRule = {
  action: string
  keyword: string
  pointValue: number
  pointLimit: number
  _id: string
}
