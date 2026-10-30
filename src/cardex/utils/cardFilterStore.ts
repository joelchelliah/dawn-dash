import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { CardCodexSearchFilterCache, FormattingCardFilterOption } from '@/cardex/types/cardFilters'

const CARDS_CACHE_VERSION = 'v1'
const CARDS_CACHE_KEY = `codex_cards_filters_${CARDS_CACHE_VERSION}`

/*
 * One-time migration: ShowDescription used to default to false, and the cached blob overwrites
 * defaults key-by-key, so anyone who had ever touched a filter kept descriptions off forever and
 * never discovered the setting existed. Force it on once. Done as a migration rather than a cache
 * version bump because the same blob holds `struckCards` — weekly-challenge progress that users
 * cannot reconstruct. The marker makes this a one-time nudge: turning it back off afterwards sticks.
 */
const SHOW_DESCRIPTION_MIGRATION_KEY = `${CARDS_CACHE_KEY}_show_description_migrated`

const isClient = typeof window !== 'undefined'

const applyShowDescriptionMigration = (
  cached: CardCodexSearchFilterCache
): CardCodexSearchFilterCache => {
  if (!isClient) return cached

  try {
    if (localStorage.getItem(SHOW_DESCRIPTION_MIGRATION_KEY)) return cached

    const migrated = {
      ...cached,
      formatting: {
        ...cached.formatting,
        [FormattingCardFilterOption.ShowDescription]: true,
      },
    }

    /*
     * Write the migrated blob back immediately rather than waiting for the debounced cache write:
     * that write only fires once the user touches a filter, so a visitor who just looks and leaves
     * would keep a blob saying `false` while the marker says "already migrated" — and would silently
     * revert on their next visit.
     */
    saveToCache(CARDS_CACHE_KEY, migrated)
    localStorage.setItem(SHOW_DESCRIPTION_MIGRATION_KEY, 'true')

    return migrated
  } catch {
    // localStorage can throw (private mode, quota). Migrating is a nicety, not worth failing over.
    return cached
  }
}

export const cacheCardCodexSearchFilters = (filters: CardCodexSearchFilterCache) => {
  saveToCache(CARDS_CACHE_KEY, filters)
}

export const getCachedCardCodexSearchFilters = (): CardCodexSearchFilterCache | null => {
  const cached = getFromCache<CardCodexSearchFilterCache>(CARDS_CACHE_KEY, null).data

  return cached ? applyShowDescriptionMigration(cached) : null
}
