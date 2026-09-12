import { CardData } from '@/codex/types/cards'

export interface TreasureCard {
  id: number
  name: string
  category: string
  type: string
  inCardRewards: boolean
  inMerchant: boolean
  inAlchemist: boolean
  fromTranspose: boolean
  fromTrade: boolean
  fromEvents: string[]
  fromTreasureEvents: string[]
  fromCards: string[]
  fromTalents: string[]
}

export interface TreasurePool {
  pool: string
  contains: string[]
  size: number
  reachedBy: PoolReachedBy[]
}

export interface PoolReachedBy {
  card?: string
  talent?: string
  event?: string
}

export interface EnrichedTreasureCard {
  treasureDetails: TreasureCard
  cardDetails: CardData
}

export interface RelatedCard {
  name: string
  isTalent: boolean
  category?: number
}
