import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { TransmuteSearchFilterCache } from '@/transmute/types/filters'

const TRANSMUTE_CACHE_VERSION = 'v1'
const TRANSMUTE_CACHE_KEY = `codex_transmute_filters_${TRANSMUTE_CACHE_VERSION}`

export const cacheTransmuteSearchFilters = (filters: TransmuteSearchFilterCache) => {
  saveToCache(TRANSMUTE_CACHE_KEY, filters)
}

export const getCachedTransmuteSearchFilters = (): TransmuteSearchFilterCache | null => {
  return getFromCache<TransmuteSearchFilterCache>(TRANSMUTE_CACHE_KEY, null).data
}
