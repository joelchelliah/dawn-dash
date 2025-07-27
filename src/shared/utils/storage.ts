import { CachedData } from '../types/cache'

const emptyCacheState = {
  data: null,
  isStale: true,
  timestamp: null,
}

const isClient = typeof window !== 'undefined'

export function saveToCache<T>(cacheKey: string, data: T): void {
  if (!isClient) return

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

export function getFromCache<T>(cacheKey: string, cacheDuration: number | null): CachedData<T> {
  if (!isClient) return emptyCacheState

  try {
    const cache = localStorage.getItem(cacheKey)

    if (!cache) return emptyCacheState

    const { data, timestamp } = JSON.parse(cache)
    const isStale = cacheDuration ? Date.now() - timestamp > cacheDuration : false

    return {
      data: data as T,
      isStale,
      timestamp,
    }
  } catch (error) {
    console.warn('Failed to read from cache:', error)
    return emptyCacheState
  }
}
