import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { EventSearchFilterCache } from '@/eventmaps/types/eventFilters'

const EVENTS_CACHE_VERSION = 'v2'
const EVENTS_CACHE_KEY = `codex_events_filters_${EVENTS_CACHE_VERSION}`

export const cacheEventSearchFilters = (filters: EventSearchFilterCache) => {
  saveToCache(EVENTS_CACHE_KEY, filters)
}

export const getCachedEventSearchFilters = (): EventSearchFilterCache | null => {
  return getFromCache<EventSearchFilterCache>(EVENTS_CACHE_KEY, null).data
}
