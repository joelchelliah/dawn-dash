import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { EventCodexSearchFilterCache } from '@/eventmaps/types/eventFilters'

const EVENTS_CACHE_VERSION = 'v2'
const EVENTS_CACHE_KEY = `codex_events_filters_${EVENTS_CACHE_VERSION}`

export const cacheEventCodexSearchFilters = (filters: EventCodexSearchFilterCache) => {
  saveToCache(EVENTS_CACHE_KEY, filters)
}

export const getCachedEventCodexSearchFilters = (): EventCodexSearchFilterCache | null => {
  return getFromCache<EventCodexSearchFilterCache>(EVENTS_CACHE_KEY, null).data
}
