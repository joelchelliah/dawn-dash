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

export interface TalentRenderingContext {
  shouldShowDescription: boolean
  shouldShowCardSet: (index?: number) => boolean
  shouldShowBlightbaneLink: boolean
  parsedKeywords: string[]
}

export interface TalentNodeHeight {
  height: number
  contentHeight: number
}

const heightCache = new Map<string, TalentNodeHeight>()

const createCacheKey = (
  talentName: string,
  showDescription: boolean,
  showCardSet: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): string =>
  `${talentName}:description-${showDescription}:card-set-${showCardSet}:keywords-${showKeywordsSection}:blightbane-${showBlightbaneLink}`

export const getCachedDimensions = (
  talentName: string,
  showDescription: boolean,
  showCardSet: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): TalentNodeHeight | undefined =>
  heightCache.get(
    createCacheKey(
      talentName,
      showDescription,
      showCardSet,
      showKeywordsSection,
      showBlightbaneLink
    )
  )

export const setCachedHeight = (
  talentName: string,
  height: TalentNodeHeight,
  showDescription: boolean,
  showCardSet: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): void => {
  heightCache.set(
    createCacheKey(
      talentName,
      showDescription,
      showCardSet,
      showKeywordsSection,
      showBlightbaneLink
    ),
    height
  )
}

export const hasCachedDimensions = (
  talentName: string,
  showDescription: boolean,
  showCardSet: boolean,
  showKeywordsSection: boolean,
  showBlightbaneLink: boolean
): boolean =>
  heightCache.has(
    createCacheKey(
      talentName,
      showDescription,
      showCardSet,
      showKeywordsSection,
      showBlightbaneLink
    )
  )

/**
 * Pre-populates the cache with heights for all nodes in a talent tree.
 * Only calculates heights if they don't already exist for the given settings.
 * Width is not cached since it's always static.
 */
export const buildDimensionCache = (
  rootNode: HierarchicalTalentTreeNode,
  context: TalentRenderingContext,
  calculateHeight: (
    node: HierarchicalTalentTreeNode,
    context: TalentRenderingContext
  ) => TalentNodeHeight
): void => {
  const cacheNodeRecursive = (node: HierarchicalTalentTreeNode) => {
    const showDescription = context.shouldShowDescription
    const showCardSet = context.shouldShowCardSet(node.cardSetIndex)
    // Keywords section is shown if BOTH showKeywords filter is on AND this node has matching keywords
    const showKeywordsSection =
      context.parsedKeywords.length > 0 &&
      getMatchingKeywordsText(node, context.parsedKeywords).length > 0

    if (
      hasCachedDimensions(
        node.name,
        showDescription,
        showCardSet,
        showKeywordsSection,
        context.shouldShowBlightbaneLink
      )
    ) {
      // Still need to recurse to cache children, even if the height is already cached for this node
      if (node.children) {
        node.children.forEach(cacheNodeRecursive)
      }
      return
    }

    const height = calculateHeight(node, context)

    setCachedHeight(
      node.name,
      height,
      showDescription,
      showCardSet,
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
  heightCache.clear()
}
