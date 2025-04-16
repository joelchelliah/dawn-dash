import { getFromCache, saveToCache } from '../../shared/utils/storage'
import { CardCodexSearchFilterCache } from '../types/filters'

const CACHE_VERSION = 'v0'
const CACHE_KEY = `codex_cards_filters_${CACHE_VERSION}`

export const cacheCardCodexSearchFilters = (filters: CardCodexSearchFilterCache) => {
  saveToCache(CACHE_KEY, filters)
}

export const getCachedCardCodexSearchFilters = (): CardCodexSearchFilterCache | null => {
  return getFromCache<CardCodexSearchFilterCache>(CACHE_KEY, null).data
}
