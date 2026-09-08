import { CardData } from '@/codex/types/cards'

export interface TreasureCard {
  id: number
  name: string
  category: string
  type: string
  isTreasure: boolean
  inSunforge: boolean
  inCardRewards: boolean
  inConjurations: boolean
  inMerchant: boolean
  inAlchemist: boolean
  canBeAcquired: boolean
  fromTranspose: boolean
  fromTrade: boolean
  fromEvents: TreasureEventSource[]
  fromTreasureEvents: TreasurePoolEventSource[]
  fromCards: TreasureCardSource[]
  fromTalents: TreasureTalentSource[]
  // Null when the card is always reachable via addcardbykeyword;
  // otherwise names the card sets whose absence makes it unreachable.
  missingFromAddCardByKeyword: MissingFromAddCardByKeyword | null
}

export interface TreasurePool {
  pool: string
  name: string
  // Card categories the pool can offer. The UI's reward tags are built from this.
  contains: string[]
  // The engine's filter, as prose. Reference material for writing the notes in
  // `constants/treasurePools.ts` — nothing renders it.
  predicate: string | null
  useAllCardSets: boolean
  size: number
  // Only present on pools that mix treasure-keyword cards in with other candidates.
  keywordShare?: number
  reachedBy: PoolReachedBy[]
}

export interface TreasureEventSource {
  event: string
  command: string
}

export interface TreasurePoolEventSource extends TreasureEventSource {
  pool: string
}

export interface TreasureCardSource {
  card: string
  pool: string
  command: string
}

export interface TreasureTalentSource {
  talent: string
  pool: string
  command: string
}

// Exactly one of card/talent/event identifies the source.
export interface PoolReachedBy {
  card?: string
  talent?: string
  event?: string
  command: string
}

export interface MissingFromAddCardByKeyword {
  whenDisabled: string[] | null
}

export interface EnrichedTreasureCard {
  treasureDetails: TreasureCard
  cardDetails: CardData
}
