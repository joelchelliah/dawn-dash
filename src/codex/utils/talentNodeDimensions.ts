import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  HierarchicalTalentTreeNode,
  TalentTreeNodeType,
  TalentRenderingContext,
  TalentNodeHeight,
} from '@/codex/types/talents'
import { NODE, REQUIREMENT_NODE } from '@/codex/constants/talentTreeValues'

import { wrapTalentText } from './talentTextMeasurer'
import { createDimensionCache } from './tree/nodeDimensionCache'
import { getMatchingKeywordsText } from './talentTreeHelper'

/**
 * Node lookup map type for O(1) access to nodes by ID
 */
export type NodeMap = Map<string, HierarchicalTalentTreeNode>

// ===========================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Type guard for talent nodes
 */
export const isTalentNode = (node: HierarchicalTalentTreeNode): boolean => {
  return node.type === TalentTreeNodeType.TALENT
}

/**
 * Type guard for requirement nodes (class, energy, event, card, offer)
 */
export const isRequirementNode = (node: HierarchicalTalentTreeNode): boolean => {
  return (
    node.type === TalentTreeNodeType.NO_REQUIREMENTS ||
    node.type === TalentTreeNodeType.CLASS_REQUIREMENT ||
    node.type === TalentTreeNodeType.ENERGY_REQUIREMENT ||
    node.type === TalentTreeNodeType.EVENT_REQUIREMENT ||
    node.type === TalentTreeNodeType.CARD_REQUIREMENT ||
    node.type === TalentTreeNodeType.OFFER_REQUIREMENT ||
    node.type === TalentTreeNodeType.UNAVAILABLE_REQUIREMENT
  )
}

/**
 * Check if a talent has additional requirements (talent or other requirements)
 */
export const hasAdditionalRequirements = (node: HierarchicalTalentTreeNode): boolean => {
  if (!isTalentNode(node)) return false

  const additionalRequirements = [
    ...(node.otherRequirements || []),
    ...(node.talentRequirements || []),
  ].filter(isNotNullOrUndefined)

  return additionalRequirements.length > 0
}

// ============================================================================
// Height Calculation
// ============================================================================

/**
 * Calculate dynamic node height based on talent node content.
 */
const _getNodeHeight = (
  node: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): TalentNodeHeight => {
  if (isRequirementNode(node)) {
    const height = REQUIREMENT_NODE.RADIUS_DEFAULT * 2
    return { height, contentHeight: height }
  }

  if (isTalentNode(node)) {
    const isDescriptionHidden = !context.shouldShowDescription

    let outerHeight = 0

    // Card set height
    if (context.shouldShowCardSet(node.cardSetIndex)) {
      outerHeight += NODE.CARD_SET.HEIGHT + NODE.CARD_SET.TOP_MARGIN + NODE.CARD_SET.BOTTOM_MARGIN
    }

    // Name height
    let contentHeight = isDescriptionHidden
      ? NODE.NAME.HEIGHT_NO_DESCRIPTION + 2 * NODE.NAME.VERTICAL_MARGIN
      : NODE.NAME.HEIGHT + 2 * NODE.NAME.VERTICAL_MARGIN

    // Additional requirements height
    if (hasAdditionalRequirements(node)) {
      const reqHeight = isDescriptionHidden
        ? NODE.ADDITIONAL_REQUIREMENTS.HEIGHT_NO_DESCRIPTION
        : NODE.ADDITIONAL_REQUIREMENTS.HEIGHT
      const reqMargin = isDescriptionHidden
        ? NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN_NO_DESCRIPTION
        : NODE.ADDITIONAL_REQUIREMENTS.VERTICAL_MARGIN
      contentHeight += reqHeight + 2 * reqMargin
    }

    // Description height
    if (!isDescriptionHidden) {
      const descLines = wrapTalentText(
        node.description,
        NODE.WIDTH - 2 * NODE.DESCRIPTION.HORIZONTAL_MARGIN
      )
      const descriptionHeight = descLines.length * NODE.DESCRIPTION.LINE_HEIGHT

      contentHeight += descriptionHeight + 2 * NODE.DESCRIPTION.VERTICAL_MARGIN
    }

    // Blightbane link height
    if (context.shouldShowBlightbaneLink) {
      contentHeight += NODE.BLIGHTBANE_LINK.HEIGHT + 2 * NODE.BLIGHTBANE_LINK.VERTICAL_MARGIN
    }

    // Keywords height
    if (
      context.parsedKeywords.length > 0 &&
      getMatchingKeywordsText(node, context.parsedKeywords).length > 0
    ) {
      outerHeight += NODE.KEYWORDS.HEIGHT + NODE.KEYWORDS.TOP_MARGIN + NODE.KEYWORDS.BOTTOM_MARGIN
    }

    return { height: outerHeight + contentHeight, contentHeight }
  }

  if (node.type === undefined) {
    return { height: 0, contentHeight: 0 }
  }

  throw new Error(`Unknown node type: ${node.type}`)
}

// ============================================================================
// Main Dimension Calculation Functions
// ============================================================================

export const getNodeHalfWidth = (node: HierarchicalTalentTreeNode) => {
  switch (node.type) {
    case TalentTreeNodeType.TALENT:
      return NODE.WIDTH / 2
    default:
      return REQUIREMENT_NODE.RADIUS_DEFAULT
  }
}

interface TalentDimensionKey {
  node: HierarchicalTalentTreeNode
  context: TalentRenderingContext
}

/**
 * Talents are cached by their characteristics (name, requirements, rendering settings),
 * since the same talent can appear in multiple trees and will always have the same
 * dimensions given the same rendering context. The cache persists across tree changes.
 */
const dimensionCache = createDimensionCache<TalentDimensionKey, TalentNodeHeight>(
  ({ node, context }) => {
    const specialRequirements = [
      ...node.otherRequirements,
      ...node.talentRequirements,
      ...node.classOrEnergyRequirements,
    ].join(',')
    const showCardSet = context.shouldShowCardSet(node.cardSetIndex)
    // Keywords section is shown if BOTH showKeywords filter is on AND this node has matching keywords
    const showKeywordsSection =
      context.parsedKeywords.length > 0 &&
      getMatchingKeywordsText(node, context.parsedKeywords).length > 0

    return `${node.name}:req-${specialRequirements}:description-${context.shouldShowDescription}:card-set-${showCardSet}:keywords-${showKeywordsSection}:blightbane-${context.shouldShowBlightbaneLink}`
  }
)

export const getNodeHeight = (
  node: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): TalentNodeHeight => dimensionCache.get({ node, context }) ?? _getNodeHeight(node, context)

/**
 * Pre-populates the cache with heights for all nodes in a talent tree.
 * Only calculates heights if they don't already exist for the given settings.
 * Width is not cached since it's always static.
 */
export const cacheAllNodeDimensions = (
  rootNode: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): void => {
  const cacheNodeRecursive = (node: HierarchicalTalentTreeNode) => {
    const key = { node, context }
    if (!dimensionCache.has(key)) {
      dimensionCache.set(key, _getNodeHeight(node, context))
    }
    node.children?.forEach(cacheNodeRecursive)
  }

  cacheNodeRecursive(rootNode)
}
