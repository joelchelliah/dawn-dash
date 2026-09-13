import { CardData } from '@/codex/types/cards'
import { Event } from '@/codex/types/events'

export type TreasureSourceType = 'card' | 'talent' | 'event'

export interface TreasureSource {
  sourceType: TreasureSourceType
  name: string
  pool: string | null
}

export type PoolReachedBy = Omit<TreasureSource, 'pool'>

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

/*
 * An event plus the pool it draws a given treasure from; absent for a guaranteed drop.
 */
export type EnrichedEvent = Event & {
  pool?: string
}

export interface EnrichedTreasureCard {
  treasureDetails: TreasureCard
  cardDetails: CardData
}

export interface RelatedCard {
  name: string
  isTalent: boolean
  category?: number
  pool?: string
}
