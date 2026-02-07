/**
 * Dimension caching system for talent tree nodes.
 *
 * This cache significantly improves performance by calculating each node's
 * width and height only once, then reusing those values throughout the
 * rendering pipeline (node drawing, link calculations, text placement, etc.).
 *
 * Talents are cached by their characteristics (name, state, filters),
 * since the same talent can appear in multiple trees and will always
 * have the same dimensions given the same rendering context.
 *
 * Lifecycle:
 * 1. Create cache when talent tree component mounts
 * 2. Pre-populate dimensions for all nodes in the tree
 * 3. All rendering code reads from cache
 * 4. Cache persists across tree changes (since talents are global)
 * 5. Cache is cleared when rendering context changes significantly
 */

import { HierarchicalTalentTreeNode } from '@/codex/types/talents'

import { getMatchingKeywordsText } from './talentTreeHelper'

/**
 * Rendering context interface (matching TalentRenderingContext from talentNodeDimensions)
 */
interface RenderingContext {
  isDescriptionExpanded: (name: string) => boolean
  shouldShowBlightbaneLink: boolean
  parsedKeywords: string[]
}

/**
 * Cached dimensions for a single node.
 */
interface NodeDimensions {
  width: number
  height: number
}

const dimensionCache = new Map<string, NodeDimensions>()

const createCacheKey = (
  talentName: string,
  showDescription: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): string =>
  `${talentName}:description-${showDescription}:keywords-${showKeywordsSection}:blightbane-${showBlightbaneLink}`

export const getCachedDimensions = (
  talentName: string,
  showDescription: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): NodeDimensions | undefined =>
  dimensionCache.get(
    createCacheKey(talentName, showDescription, showKeywordsSection, showBlightbaneLink)
  )

export const setCachedDimensions = (
  talentName: string,
  width: number,
  height: number,
  showDescription: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): void => {
  dimensionCache.set(
    createCacheKey(talentName, showDescription, showKeywordsSection, showBlightbaneLink),
    {
      width,
      height,
    }
  )
}

export const hasCachedDimensions = (
  talentName: string,
  showDescription: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): boolean =>
  dimensionCache.has(
    createCacheKey(talentName, showDescription, showKeywordsSection, showBlightbaneLink)
  )

/**
 * Pre-populates the cache with dimensions for all nodes in a talent tree.
 * Only calculates dimensions if they don't already exist for the given settings.
 */
export const buildDimensionCache = (
  rootNode: HierarchicalTalentTreeNode,
  context: RenderingContext,
  calculateWidth: (node: HierarchicalTalentTreeNode, context: RenderingContext) => number,
  calculateHeight: (
    node: HierarchicalTalentTreeNode,
    width: number,
    context: RenderingContext
  ) => number
): void => {
  const cacheNodeRecursive = (node: HierarchicalTalentTreeNode) => {
    const showDescription = context.isDescriptionExpanded(node.name)
    // Keywords section is shown if BOTH showKeywords filter is on AND this node has matching keywords
    const showKeywordsSection =
      context.parsedKeywords.length > 0 &&
      getMatchingKeywordsText(node, context.parsedKeywords).length > 0

    if (
      hasCachedDimensions(
        node.name,
        showDescription,
        showKeywordsSection,
        context.shouldShowBlightbaneLink
      )
    ) {
      // Still need to recurse to cache children, even if the dimensions are already cached for this node
      if (node.children) {
        node.children.forEach(cacheNodeRecursive)
      }
      return
    }

    const width = calculateWidth(node, context)
    const height = calculateHeight(node, width, context)

    setCachedDimensions(
      node.name,
      width,
      height,
      showDescription,
      showKeywordsSection,
      context.shouldShowBlightbaneLink
    )

    // Recursively cache children
    if (node.children) {
      node.children.forEach(cacheNodeRecursive)
    }
  }

  cacheNodeRecursive(rootNode)
}

export const clearAllCache = (): void => {
  dimensionCache.clear()
}
