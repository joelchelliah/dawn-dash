import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { CardCodexSearchFilterCache, TalentCodexSearchFilterCache } from '@/codex/types/filters'

const CARDS_CACHE_VERSION = 'v1'
const CARDS_CACHE_KEY = `codex_cards_filters_${CARDS_CACHE_VERSION}`

export const cacheCardCodexSearchFilters = (filters: CardCodexSearchFilterCache) => {
  saveToCache(CARDS_CACHE_KEY, filters)
}

export const getCachedCardCodexSearchFilters = (): CardCodexSearchFilterCache | null => {
  return getFromCache<CardCodexSearchFilterCache>(CARDS_CACHE_KEY, null).data
}

const TALENTS_CACHE_VERSION = 'v2'
const TALENTS_CACHE_KEY = `codex_talents_filters_${TALENTS_CACHE_VERSION}`

export const cacheTalentCodexSearchFilters = (filters: TalentCodexSearchFilterCache) => {
  saveToCache(TALENTS_CACHE_KEY, filters)
}

export const getCachedTalentCodexSearchFilters = (): TalentCodexSearchFilterCache | null => {
  return getFromCache<TalentCodexSearchFilterCache>(TALENTS_CACHE_KEY, null).data
}
