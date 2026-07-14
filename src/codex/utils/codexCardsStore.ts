import { CachedData } from '@/shared/types/cache'
import { CacheWriteResult, getFromCache, saveToCache } from '@/shared/utils/storage'

import { CardData } from '@/codex/types/cards'

const CACHE_VERSION = 'v2'
const CACHE_KEY = `codex_cards_${CACHE_VERSION}`
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day

export function cacheCardData(cards: CardData[]): CacheWriteResult {
  return saveToCache(CACHE_KEY, cards)
}

export function getCachedCardData(): CachedData<CardData[]> {
  return getFromCache(CACHE_KEY, CACHE_DURATION)
}

export function getCachedCardDataTimestamp(): number | null {
  return getCachedCardData().timestamp
}
