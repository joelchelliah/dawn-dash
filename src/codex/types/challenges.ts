import { Banner, CardSet } from './filters'

export type ChallengeData = {
  id: number
  name: string
  keywords: Set<string>
  specialKeywords: Set<string>
  hadNegativeKeywords: boolean
  cardSets: Set<CardSet>
  banners: Set<Banner>
}
