const CACHE_KEY_PREFIX = 'speedruns'
const TIMESTAMP_KEY_PREFIX = `${CACHE_KEY_PREFIX}_timestamp`
const CACHE_DURATION = 10 * 60 * 1000

type CachedData<T> = {
  data: T | null
  isStale: boolean
}

export function saveToCache(key: string, data: unknown) {
  try {
    localStorage.setItem(getCacheKey(key), JSON.stringify(data))
    localStorage.setItem(getTimestampKey(key), Date.now().toString())
  } catch (error) {
    console.warn('Failed to save to cache:', error)
  }
}

export function getFromCache<T>(key: string): CachedData<T> {
  try {
    const data = localStorage.getItem(getCacheKey(key))
    const timestamp = localStorage.getItem(getTimestampKey(key))

    if (!data || !timestamp) return { data: null, isStale: true }

    const isStale = Date.now() - parseInt(timestamp) > CACHE_DURATION

    return { data: JSON.parse(data) as T, isStale }
  } catch (error) {
    console.warn('Failed to read from cache:', error)

    return { data: null, isStale: true }
  }
}

function getCacheKey(type: string) {
  return `${CACHE_KEY_PREFIX}_${type}`
}

function getTimestampKey(type: string) {
  return `${TIMESTAMP_KEY_PREFIX}_${type}`
}
