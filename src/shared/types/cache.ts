export enum CacheType {
  Speedruns = 'speedruns',
  CodexCards = 'codex-cards',
  CodexCardsFilters = 'codex-cards-filters',
}

export type CacheSchema<T> = {
  data: T
  timestamp: number
}

export type CachedData<T> = {
  data: T | null
  isStale: boolean
  timestamp: number | null
}
