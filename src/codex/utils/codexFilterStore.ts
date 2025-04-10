import { CardCodexSearchFilterCache } from '../types/filters'

const CARDS_FILTER_CACHE_VERSION = 'v0'
const CARDS_FILTER_CACHE_KEY = `codex_cards_${CARDS_FILTER_CACHE_VERSION}`

// TODO: Rewrite to use as a hook

// TODO: Look into using typed-local-storage

export const getCachedCardCodexSearchFilters = (): CardCodexSearchFilterCache | null => {
  const cache = localStorage.getItem(CARDS_FILTER_CACHE_KEY)

  try {
    return cache ? JSON.parse(cache) : null
  } catch (error) {
    console.warn('Failed to read from cache:', error)
    return null
  }
}

export const cacheCardCodexSearchFilters = (filters: CardCodexSearchFilterCache) => {
  try {
    localStorage.setItem(CARDS_FILTER_CACHE_KEY, JSON.stringify(filters))
  } catch (error) {
    console.warn('Failed to save to cache:', error)
  }
}
