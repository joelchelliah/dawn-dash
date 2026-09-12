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
  fromEvents: TreasureEventSource[]
  fromTreasureEvents: TreasureEventSource[]
  fromCards: TreasureCardSource[]
  fromTalents: TreasureTalentSource[]
}

export interface TreasurePool {
  pool: string
  // Card categories the pool can offer. The UI's reward tags are built from this.
  contains: string[]
  size: number
  reachedBy: PoolReachedBy[]
}

export interface TreasureEventSource {
  event: string
}

export interface TreasureCardSource {
  card: string
}

export interface TreasureTalentSource {
  talent: string
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
