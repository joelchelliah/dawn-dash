import { CachedData } from '../types/cache'

import { logger } from './logger'

const emptyCacheState = {
  data: null,
  isStale: true,
  timestamp: null,
}

const isClient = typeof window !== 'undefined'

export interface CacheWriteResult {
  success: boolean
  error?: Error
}

export function saveToCache<T>(cacheKey: string, data: T): CacheWriteResult {
  if (!isClient) return { success: true }

  try {
    const cache = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(cache))
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    }
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
    logger.warn('Failed to read from cache:', error)
    return emptyCacheState
  }
}
