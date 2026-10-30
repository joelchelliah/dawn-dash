import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { TalentCodexSearchFilterCache } from '@/codex/types/talentFilters'

const TALENTS_CACHE_VERSION = 'v3'
const TALENTS_CACHE_KEY = `codex_talents_filters_${TALENTS_CACHE_VERSION}`

export const cacheTalentCodexSearchFilters = (filters: TalentCodexSearchFilterCache) => {
  saveToCache(TALENTS_CACHE_KEY, filters)
}

export const getCachedTalentCodexSearchFilters = (): TalentCodexSearchFilterCache | null => {
  return getFromCache<TalentCodexSearchFilterCache>(TALENTS_CACHE_KEY, null).data
}
