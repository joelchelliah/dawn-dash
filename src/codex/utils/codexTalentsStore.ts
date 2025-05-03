import { CachedData } from '../../shared/types/cache'
import { getFromCache, saveToCache } from '../../shared/utils/storage'
import { TalentData } from '../types/talents'

const CACHE_VERSION = 'v0'
const CACHE_KEY = `codex_talents_${CACHE_VERSION}`
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day

export function cacheTalentData(talents: TalentData[]) {
  saveToCache(CACHE_KEY, talents)
}

export function getCachedTalentData(): CachedData<TalentData[]> {
  return getFromCache(CACHE_KEY, CACHE_DURATION)
}

export function getCachedTalentDataTimestamp(): number | null {
  return getCachedTalentData().timestamp
}
