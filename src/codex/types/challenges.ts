import { CardSet } from '@/shared/types/filters'

import { Banner } from './cardFilters'

export type ChallengeData = {
  id: number
  name: string
  keywords: Set<string>
  specialKeywords: Set<string>
  hadNegativeKeywords: boolean
  cardSets: Set<CardSet>
  banners: Set<Banner>
}
