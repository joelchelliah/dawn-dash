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

import { LevelOfDetail } from '../constants/eventSearchValues'

/**
 * Node lookup map type for O(1) access to nodes by ID
 */
type NodeMap = Map<number, EventTreeNode>

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

const createCacheKey = (
  eventId: string,
  nodeId: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): string =>
  `${eventId}:${nodeId}:looping-${showLoopingIndicator}:level-${levelOfDetail}:continues-${showContinuesTags}`

export const getCachedDimensions = (
  eventId: string,
  nodeId: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): NodeDimensions | undefined => {
  const cached = dimensionCache.get(
    createCacheKey(eventId, nodeId, showLoopingIndicator, levelOfDetail, showContinuesTags)
  )

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
  height: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): void => {
  dimensionCache.set(
    createCacheKey(eventId, nodeId, showLoopingIndicator, levelOfDetail, showContinuesTags),
    {
      width,
      height,
    }
  )
}

export const hasCachedDimensions = (
  eventId: string,
  nodeId: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): boolean =>
  dimensionCache.has(
    createCacheKey(eventId, nodeId, showLoopingIndicator, levelOfDetail, showContinuesTags)
  )

/**
 * Pre-populates the cache with dimensions for all nodes in an event tree.
 * Only recalculates dimensions if they don't already exist for the given settings.
 * This allows switching between different rendering modes without recalculation.
 */
export const buildDimensionCache = (
  nodeMap: NodeMap,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean,
  calculateWidth: (
    nodeMap: NodeMap,
    node: EventTreeNode,
    showLoopingIndicator: boolean,
    levelOfDetail: LevelOfDetail,
    showContinuesTags: boolean
  ) => number,
  calculateHeight: (
    node: EventTreeNode,
    width: number,
    showLoopingIndicator: boolean,
    levelOfDetail: LevelOfDetail,
    showContinuesTags: boolean
  ) => number
): void => {
  if (!event.rootNode) return

  // Check if we already have cached dimensions for this exact configuration
  const alreadyCached = hasCachedDimensions(
    event.name,
    event.rootNode.id,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
  )

  if (alreadyCached) {
    // Skip recalculation - dimensions already exist for this configuration
    return
  }

  const cacheNodeRecursive = (node: EventTreeNode) => {
    const width = calculateWidth(
      nodeMap,
      node,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )
    const height = calculateHeight(
      node,
      width,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )

    setCachedDimensions(
      event.name,
      node.id,
      width,
      height,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )

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
