export interface TreasureCard {
  id: number
  name: string
  isTreasure: boolean
  inSunforge: boolean
  inCardRewards: boolean
  inConjurations: boolean
  inMerchant: boolean
  inAlchemist: boolean
  canBeAcquired: boolean
  fromEvents: TreasureEventSource[]
  fromCards: TreasureCardSource[]
  fromTalents: TreasureTalentSource[]
  // Null when the card is always reachable via addcardbykeyword;
  // otherwise names the card sets whose absence makes it unreachable.
  missingFromAddCardByKeyword: MissingFromAddCardByKeyword | null
}

export interface TreasurePool {
  pool: string
  name: string
  predicate: string
  useAllCardSets: boolean
  size: number
  // Only present on pools that mix treasure-keyword cards in with other candidates.
  keywordShare?: number
  reachedBy: PoolReachedBy[]
  note?: string
}

export interface TreasureEventSource {
  event: string
  pool: string
  command: string
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
