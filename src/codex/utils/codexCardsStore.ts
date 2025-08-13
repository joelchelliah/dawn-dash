import { CachedData } from '@/shared/types/cache'
import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { CardData } from '@/codex/types/cards'

const CACHE_VERSION = 'v1'
const CACHE_KEY = `codex_cards_${CACHE_VERSION}`
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day

export function cacheCardData(cards: CardData[]) {
  try {
    saveToCache(CACHE_KEY, cards)
  } catch (e) {
    console.warn('Failed to cache cards:', e)
  }
}

export function getCachedCardData(): CachedData<CardData[]> {
  return getFromCache(CACHE_KEY, CACHE_DURATION)
}

export function getCachedCardDataTimestamp(): number | null {
  return getCachedCardData().timestamp
}
