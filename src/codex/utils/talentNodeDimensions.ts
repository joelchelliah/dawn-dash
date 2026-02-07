import { isNotNullOrUndefined } from '@/shared/utils/object'

import { HierarchicalTalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import { NODE, REQUIREMENT_NODE, TEXT } from '@/codex/constants/talentTreeValues'

import { wrapTalentText } from './talentTextWidthEstimation'
import { getCachedDimensions, buildDimensionCache as buildCache } from './talentNodeDimensionCache'
import { getMatchingKeywordsText } from './talentTreeHelper'

/**
 * Node lookup map type for O(1) access to nodes by ID
 */
export type NodeMap = Map<string, HierarchicalTalentTreeNode>

export interface TalentRenderingContext {
  isDescriptionExpanded: (name: string) => boolean
  shouldShowBlightbaneLink: boolean
  parsedKeywords: string[]
}

// ============================================================================
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
): number => {
  // Requirement nodes have fixed height based on their radius
  if (isRequirementNode(node)) {
    return REQUIREMENT_NODE.RADIUS * 2
  }

  // Talent nodes have dynamic height based on content
  if (isTalentNode(node)) {
    const isCollapsed = !context.isDescriptionExpanded(node.name)

    let totalHeight = NODE.HEIGHT.NAME

    // Description height
    if (isCollapsed) {
      totalHeight += NODE.HEIGHT.COLLAPSED_DESCRIPTION
    } else {
      const maxTextWidth = NODE.WIDTH - TEXT.HORIZONTAL_PADDING * 2
      const descLines = wrapTalentText(node.description, maxTextWidth, 'default')
      const descriptionHeight = Math.max(
        NODE.HEIGHT.MIN_DESCRIPTION,
        descLines.length * TEXT.LINE_HEIGHT
      )
      totalHeight += descriptionHeight + NODE.PADDING.DESCRIPTION_LINES
    }

    // Additional requirements height
    if (hasAdditionalRequirements(node)) {
      totalHeight += NODE.HEIGHT.REQUIREMENTS
    }

    if (
      context.parsedKeywords.length > 0 &&
      getMatchingKeywordsText(node, context.parsedKeywords).length > 0
    ) {
      totalHeight += NODE.HEIGHT.KEYWORDS
    }

    // Blightbane link height
    if (context.shouldShowBlightbaneLink) {
      totalHeight += NODE.HEIGHT.BLIGHTBANE_LINK
    }

    // Add some padding
    totalHeight += 6

    return totalHeight
  }

  return NODE.HEIGHT.NAME
}

// ============================================================================
// Main Dimension Calculation Functions
// ============================================================================

/**
 * Get node height based on content and rendering context
 */
export const getNodeHeight = (
  node: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): number => {
  const showDescription = context.isDescriptionExpanded(node.name)
  const showKeywordsSection =
    context.parsedKeywords.length > 0 &&
    getMatchingKeywordsText(node, context.parsedKeywords).length > 0

  const cached = getCachedDimensions(
    node.name,
    showDescription,
    showKeywordsSection,
    context.shouldShowBlightbaneLink
  )

  return cached?.height ?? _getNodeHeight(node, context)
}

export const cacheAllNodeDimensions = (
  rootNode: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): void => {
  buildCache(rootNode, context, _getNodeHeight)
}
