const CACHE_VERSION = 'v4'
const CACHE_KEY_PREFIX = `speedruns_${CACHE_VERSION}`
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

type CachedData<T> = {
  data: T | null
  isStale: boolean
  timestamp: number | null
}

export function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheKey = getCacheKey(key)
    const cache = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(cache))
  } catch (error) {
    console.warn('Failed to save to cache:', error)
  }
}

export function getFromCache<T>(key: string): CachedData<T> {
  const cacheKey = getCacheKey(key)
  try {
    const cache = localStorage.getItem(cacheKey)

    if (!cache) {
      return { data: null, isStale: true, timestamp: null }
    }

    const { data, timestamp } = JSON.parse(cache)
    const isStale = Date.now() - timestamp > CACHE_DURATION

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
function getCacheKey(type: string) {
  return `${CACHE_KEY_PREFIX}_${type}`
}
