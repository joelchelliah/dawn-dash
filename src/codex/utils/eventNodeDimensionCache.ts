/**
 * Dimension caching system for event tree nodes.
 *
 * This cache significantly improves performance by calculating each node's
 * width and height only once, then reusing those values throughout the
 * rendering pipeline (node drawing, link calculations, text placement, etc.).
 *
 * Lifecycle:
 * 1. Create cache when event tree component mounts
 * 2. Pre-populate dimensions for all nodes
 * 3. All rendering code reads from cache
 * 4. Cache is cleared when component unmounts or event changes
 */

import { Event, EventTreeNode } from '@/codex/types/events'

/**
 * Cached dimensions for a single node.
 */
interface NodeDimensions {
  width: number
  height: number
}

const dimensionCache = new Map<string, NodeDimensions>()

// Track the currently cached event (for DEV warnings)
let cachedEventName: string | null = null

const createCacheKey = (eventId: string, nodeId: number): string => {
  return `${eventId}:${nodeId}`
}

export const getCachedDimensions = (
  eventId: string,
  nodeId: number
): NodeDimensions | undefined => {
  const cached = dimensionCache.get(createCacheKey(eventId, nodeId))

  // Warn in DEV if cache miss for the currently cached event
  if (!cached && cachedEventName === eventId && process.env.NODE_ENV === 'development') {
    console.warn(
      `[DimensionCache] Cache miss for node ${nodeId} in event "${eventId}". ` +
        `Cache was built but this node wasn't found! 😱`
    )
  }

  return cached
}

export const setCachedDimensions = (
  eventId: string,
  nodeId: number,
  width: number,
  height: number
): void => {
  dimensionCache.set(createCacheKey(eventId, nodeId), { width, height })
}

export const hasCachedDimensions = (eventId: string, nodeId: number): boolean => {
  return dimensionCache.has(createCacheKey(eventId, nodeId))
}

/**
 * Pre-populates the cache with dimensions for all nodes in an event tree.
 * This should be called once after the event loads and before rendering begins.
 */
export const buildDimensionCache = (
  event: Event,
  showLoopingIndicator: boolean,
  calculateWidth: (node: EventTreeNode, event: Event) => number,
  calculateHeight: (
    node: EventTreeNode,
    event: Event,
    width: number,
    showLoopingIndicator: boolean
  ) => number
): void => {
  if (!event.rootNode) return

  clearEventCache(event.name)

  const cacheNodeRecursive = (node: EventTreeNode) => {
    const width = calculateWidth(node, event)
    const height = calculateHeight(node, event, width, showLoopingIndicator)

    setCachedDimensions(event.name, node.id, width, height)

    if (node.children) {
      node.children.forEach(cacheNodeRecursive)
    }
  }

  cacheNodeRecursive(event.rootNode)

  // Track this as the currently cached event
  cachedEventName = event.name
}

export const clearEventCache = (eventName: string): void => {
  const keysToDelete: string[] = []

  dimensionCache.forEach((_, key) => {
    if (key.startsWith(`${eventName}:`)) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach((key) => dimensionCache.delete(key))

  // Clear cached event name if it matches
  if (cachedEventName === eventName) {
    cachedEventName = null
  }
}

export const clearAllCache = (): void => {
  dimensionCache.clear()
  cachedEventName = null
}
