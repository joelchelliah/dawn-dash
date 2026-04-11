import { Banner, CardSet } from './filters'

export type ChallengeData = {
  id: number
  name: string
  keywords: Set<string>
  specialKeywords: Set<string>
  cardSets: Set<CardSet>
  banners: Set<Banner>
}
