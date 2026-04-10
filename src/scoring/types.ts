export enum ScoringMode {
  Standard = 'Standard',
  Sunforge = 'Sunforge',
  WeeklyChallenge = 'WeeklyChallenge',
  Blightbane = 'Blightbane',
}

export type WeeklyChallengeData = {
  from: string
  image: string
  intro: string
  name: string
  notes: string
  scoring: WeeklyChallengeScoring
  isInvalid: boolean
  to: string
  uid: number
}

type WeeklyChallengeScoring = {
  accuracyBaseValue: number
  allowNegativeAccuracy: boolean
  buffer: number
  calculationType: string
  cardBaseValue: number
  keywords: string[]
  lowestXAmount: number
  diminishingReturnsLimit: number
  fixedValueScoring: WeeklyChallengeFixedValueScoring[]
  target: number
}

type WeeklyChallengeFixedValueScoring = {
  action: string
  keyword: string
  pointValue: number
  pointLimit: number
}
