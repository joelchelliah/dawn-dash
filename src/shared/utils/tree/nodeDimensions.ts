/**
 * Shared node-dimension engine for tree rendering (talent tree + event tree).
 *
 * Node dimensions are expensive to compute (text measurement + wrapping), so each
 * feature caches them and reuses the values throughout its rendering pipeline
 * (node drawing, link calculations, text placement, etc.).
 *
 * Each feature creates its own engine via `createNodeDimensionEngine`, providing:
 * - `makeKey`: serializes everything a node's dimensions depend on
 *   (identity + rendering settings) into a stable string cache key
 * - `getChildren`: how to traverse the tree when pre-populating
 * - `prepopulateMode`: how `cacheAll` decides what still needs computing
 *
 * The measure callback is passed per call (not in the config) because features
 * may need extra inputs to compute dimensions (e.g. the event tree needs a
 * node map for width calculation) that aren't part of the cache key.
 */

export interface NodeDimensionEngineConfig<TNode, TContext> {
  makeKey: (node: TNode, context: TContext) => string
  getChildren: (node: TNode) => TNode[] | undefined
  /**
   * - 'skip-if-root-cached': all nodes are cached together, so if the root is
   *   cached the whole walk is skipped (event tree)
   * - 'check-each-node': each node is checked individually; children are visited
   *   even on a cache hit, since the same node can appear in multiple trees (talent tree)
   */
  prepopulateMode: 'skip-if-root-cached' | 'check-each-node'
}

export interface NodeDimensionEngine<TNode, TContext, TDims> {
  getCached: (node: TNode, context: TContext) => TDims | undefined
  /** Cached dimensions, or computed on the fly (without writing to the cache) */
  getDimensions: (node: TNode, context: TContext, measure: (node: TNode) => TDims) => TDims
  /**
   * Pre-populates the cache for all nodes reachable from root.
   * Returns false when the walk was skipped because everything was already cached.
   */
  cacheAll: (root: TNode, context: TContext, measure: (node: TNode) => TDims) => boolean
  /** Removes all entries whose serialized key starts with the given prefix */
  clearByKeyPrefix: (prefix: string) => void
  clear: () => void
}

export const createNodeDimensionEngine = <TNode, TContext, TDims>(
  config: NodeDimensionEngineConfig<TNode, TContext>
): NodeDimensionEngine<TNode, TContext, TDims> => {
  const { makeKey, getChildren, prepopulateMode } = config
  const cache = new Map<string, TDims>()

  const getCached = (node: TNode, context: TContext): TDims | undefined =>
    cache.get(makeKey(node, context))

  const getDimensions = (node: TNode, context: TContext, measure: (node: TNode) => TDims): TDims =>
    getCached(node, context) ?? measure(node)

  const cacheAll = (root: TNode, context: TContext, measure: (node: TNode) => TDims): boolean => {
    if (prepopulateMode === 'skip-if-root-cached' && cache.has(makeKey(root, context))) {
      return false
    }

    const cacheNodeRecursive = (node: TNode) => {
      const key = makeKey(node, context)
      if (prepopulateMode === 'skip-if-root-cached' || !cache.has(key)) {
        cache.set(key, measure(node))
      }
      getChildren(node)?.forEach(cacheNodeRecursive)
    }

    cacheNodeRecursive(root)
    return true
  }

  const clearByKeyPrefix = (prefix: string): void => {
    const keysToDelete: string[] = []
    cache.forEach((_, cacheKey) => {
      if (cacheKey.startsWith(prefix)) {
        keysToDelete.push(cacheKey)
      }
    })
    keysToDelete.forEach((cacheKey) => cache.delete(cacheKey))
  }

  return { getCached, getDimensions, cacheAll, clearByKeyPrefix, clear: () => cache.clear() }
}
