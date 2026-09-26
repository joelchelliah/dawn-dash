import { CardData } from '@/codex/types/cards'
import { Event } from '@/codex/types/events'

export type TreasureSourceType = 'card' | 'talent' | 'event'

export interface TreasureSource {
  sourceType: TreasureSourceType
  name: string
  guaranteed: boolean
  pools: string[]
}

export type PoolReachedBy = Omit<TreasureSource, 'guaranteed' | 'pools'>

export interface TreasureCard {
  id: number
  name: string
  rarity: string
  category: string
  type: string
  inCardRewards: boolean
  inMerchant: boolean
  inAlchemist: boolean
  fromTranspose: boolean
  fromTrade: boolean
  hasConjurationRoute: boolean
  hasTradepostRoute: boolean
  fromEvents: TreasureSource[]
  fromCards: TreasureSource[]
  fromTalents: TreasureSource[]
}

export interface TreasurePool {
  pool: string
  contains: string[]
  size: number
  reachedBy: PoolReachedBy[]
}

export type EnrichedEvent = Event & {
  pools: string[]
}

export interface EnrichedTreasureCard {
  treasureDetails: TreasureCard
  cardDetails: CardData
}

export interface RelatedCard {
  name: string
  isTalent: boolean
  category?: number
  pools: string[]
}
