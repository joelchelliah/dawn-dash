const CACHE_VERSION = 'v4'
const CACHE_KEY_PREFIX = `speedruns_${CACHE_VERSION}`
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

const CARDS_CACHE_VERSION = 'v1'
const CARDS_CACHE_KEY_PREFIX = `codex_cards_${CARDS_CACHE_VERSION}`
const CARDS_CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day

type CacheType = 'speedruns' | 'cards'

type CachedData<T> = {
  data: T | null
  isStale: boolean
  timestamp: number | null
}

export function saveToCache<T>(cacheType: CacheType, data: T, key?: string): void {
  const cacheKey = getCacheKey(cacheType, key)

  try {
    const cache = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(cache))
  } catch (error) {
    console.warn('Failed to save to cache:', error)
  }
}

export function getFromCache<T>(cacheType: CacheType, key?: string): CachedData<T> {
  const cacheKey = getCacheKey(cacheType, key)

  try {
    const cache = localStorage.getItem(cacheKey)

    if (!cache) {
      return { data: null, isStale: true, timestamp: null }
    }

    const { data, timestamp } = JSON.parse(cache)
    const isStale = Date.now() - timestamp > getCacheDuration(cacheType)

    return {
      data: data as T,
      isStale,
      timestamp,
    }
  } catch (error) {
    console.warn('Failed to read from cache:', error)
    return { data: null, isStale: true, timestamp: null }
  }
}

function getCacheKey(cacheType: CacheType, key?: string) {
  return key && cacheType === 'speedruns' ? getSpeedrunCacheKey(key) : getCardsCacheKey()
}

function getSpeedrunCacheKey(type: string) {
  return `${CACHE_KEY_PREFIX}_${type}`
}

function getCardsCacheKey() {
  return CARDS_CACHE_KEY_PREFIX
}

function getCacheDuration(cacheType: CacheType = 'speedruns') {
  return cacheType === 'speedruns' ? CACHE_DURATION : CARDS_CACHE_DURATION
}
