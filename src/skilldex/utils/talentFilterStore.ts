import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { TalentSearchFilterCache } from '@/skilldex/types/talentFilters'

const TALENTS_CACHE_VERSION = 'v3'
const TALENTS_CACHE_KEY = `codex_talents_filters_${TALENTS_CACHE_VERSION}`

export const cacheTalentSearchFilters = (filters: TalentSearchFilterCache) => {
  saveToCache(TALENTS_CACHE_KEY, filters)
}

export const getCachedTalentSearchFilters = (): TalentSearchFilterCache | null => {
  return getFromCache<TalentSearchFilterCache>(TALENTS_CACHE_KEY, null).data
}
