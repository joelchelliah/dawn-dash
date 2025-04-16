import { CachedData } from '../../shared/types/cache'
import { getFromCache, saveToCache } from '../../shared/utils/storage'
import { SpeedRunData } from '../types/speedRun'

const CACHE_VERSION = 'v4'
const CACHE_KEY_PREFIX = `speedruns_${CACHE_VERSION}`
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export function cacheSpeedrunData(key: string, data: SpeedRunData[]) {
  const cacheKey = `${CACHE_KEY_PREFIX}_${key}`

  saveToCache(cacheKey, data)
}

export function getCachedSpeedrunData(key: string): CachedData<SpeedRunData[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}_${key}`

  return getFromCache(cacheKey, CACHE_DURATION)
}

export function getCachedSpeedrunDataTimestamp(key: string): number | null {
  return getCachedSpeedrunData(key).timestamp
}
