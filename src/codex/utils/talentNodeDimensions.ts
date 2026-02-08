import { isNotNullOrUndefined } from '@/shared/utils/object'

import { HierarchicalTalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import { NODE, REQUIREMENT_NODE, TEXT } from '@/codex/constants/talentTreeValues'

import { wrapTalentText } from './talentTextWidthEstimation'
import {
  getCachedDimensions,
  buildDimensionCache as buildCache,
  TalentRenderingContext,
  TalentNodeHeight,
} from './talentNodeDimensionCache'
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
    node.type === TalentTreeNodeType.OFFER_REQUIREMENT
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
    const isCollapsed = !context.shouldShowDescription

    let outerHeight = 0
    let contentHeight = NODE.HEIGHT.NAME

    // Description height
    if (isCollapsed) {
      contentHeight += NODE.HEIGHT.COLLAPSED_DESCRIPTION
    } else {
      const maxTextWidth = NODE.WIDTH - TEXT.HORIZONTAL_PADDING * 2
      const descLines = wrapTalentText(node.description, maxTextWidth, 'default')
      const descriptionHeight = Math.max(
        NODE.HEIGHT.MIN_DESCRIPTION,
        descLines.length * TEXT.LINE_HEIGHT
      )
      contentHeight += descriptionHeight + NODE.PADDING.DESCRIPTION_LINES
    }

    if (context.shouldShowBlightbaneLink) {
      contentHeight += NODE.HEIGHT.BLIGHTBANE_LINK
    }

    // Additional requirements height
    if (hasAdditionalRequirements(node)) {
      contentHeight += NODE.HEIGHT.ADDITIONAL_REQUIREMENTS
    }

    // Blightbane link height
    if (context.shouldShowBlightbaneLink) {
      outerHeight += NODE.HEIGHT.BLIGHTBANE_LINK
    }

    if (context.shouldShowCardSet(node.cardSetIndex)) {
      outerHeight += NODE.HEIGHT.CARD_SET
    }

    if (
      context.parsedKeywords.length > 0 &&
      getMatchingKeywordsText(node, context.parsedKeywords).length > 0
    ) {
      outerHeight += NODE.HEIGHT.KEYWORDS
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

export const getNodeHeight = (
  node: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): TalentNodeHeight => {
  const showKeywordsSection =
    context.parsedKeywords.length > 0 &&
    getMatchingKeywordsText(node, context.parsedKeywords).length > 0
  const showCardSet = context.shouldShowCardSet(node.cardSetIndex)

  const cached = getCachedDimensions(
    node.name,
    context.shouldShowDescription,
    showCardSet,
    showKeywordsSection,
    context.shouldShowBlightbaneLink
  )

  return cached ?? _getNodeHeight(node, context)
}

export const cacheAllNodeDimensions = (
  rootNode: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): void => {
  buildCache(rootNode, context, _getNodeHeight)
}
