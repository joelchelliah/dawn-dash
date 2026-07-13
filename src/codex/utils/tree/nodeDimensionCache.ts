/**
 * Shared node-dimension caching for tree rendering (talent tree + event tree).
 *
 * Node dimensions are expensive to compute (text measurement + wrapping), so each
 * feature caches them and reuses the values throughout its rendering pipeline
 * (node drawing, link calculations, text placement, etc.).
 *
 * Each feature creates its own cache via `createDimensionCache`, providing a
 * `makeKey` function that serializes everything a node's dimensions depend on
 * (identity + rendering settings) into a stable string key.
 */

export interface DimensionCache<K, V> {
  get: (key: K) => V | undefined
  has: (key: K) => boolean
  set: (key: K, value: V) => void
  /** Removes all entries whose serialized key starts with the given prefix */
  clearByKeyPrefix: (prefix: string) => void
  clear: () => void
}

export const createDimensionCache = <K, V>(makeKey: (key: K) => string): DimensionCache<K, V> => {
  const cache = new Map<string, V>()

  return {
    get: (key) => cache.get(makeKey(key)),
    has: (key) => cache.has(makeKey(key)),
    set: (key, value) => {
      cache.set(makeKey(key), value)
    },
    clearByKeyPrefix: (prefix) => {
      const keysToDelete: string[] = []
      cache.forEach((_, cacheKey) => {
        if (cacheKey.startsWith(prefix)) {
          keysToDelete.push(cacheKey)
        }
      })
      keysToDelete.forEach((cacheKey) => cache.delete(cacheKey))
    },
    clear: () => cache.clear(),
  }
}
