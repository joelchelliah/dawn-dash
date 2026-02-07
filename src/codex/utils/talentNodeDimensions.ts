import { isNotNullOrUndefined } from '@/shared/utils/object'

import { HierarchicalTalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import { NODE, REQUIREMENT_NODE, TEXT } from '@/codex/constants/talentTreeValues'

import { measureTalentTextWidth, wrapTalentText } from './talentTextWidthEstimation'
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
// Width Calculation
// ============================================================================

/**
 * Calculate dynamic node width based on talent node content
 */
const _getNodeWidth = (
  node: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): number => {
  // Requirement nodes have fixed width based on their radius
  if (isRequirementNode(node)) {
    return REQUIREMENT_NODE.RADIUS * 2
  }

  // Talent nodes have dynamic width based on content
  if (isTalentNode(node)) {
    const isCollapsed = !context.isDescriptionExpanded(node.name)
    const isNameReallyLong = node.name.length > NODE.NAME.REALLY_LONG_THRESHOLD

    let maxWidth: number = NODE.WIDTH

    // Name width (when collapsed, names are shown larger)
    if (isCollapsed) {
      const nameFont = isNameReallyLong ? 'nameCollapsedLong' : 'nameCollapsed'
      const nameWidth = measureTalentTextWidth(node.name, nameFont) + TEXT.HORIZONTAL_PADDING * 2
      maxWidth = Math.max(maxWidth, nameWidth)
    }

    if (!isCollapsed) {
      const descWidth =
        measureTalentTextWidth(node.description, 'default') + TEXT.HORIZONTAL_PADDING * 2
      maxWidth = Math.max(maxWidth, descWidth)
    }

    if (hasAdditionalRequirements(node)) {
      const requirements = [
        ...(node.otherRequirements || []),
        ...(node.talentRequirements || []),
      ].filter(isNotNullOrUndefined)

      const reqText = `Requires: ${requirements.join(', ')}!`
      const reqWidth = measureTalentTextWidth(reqText, 'default') + TEXT.HORIZONTAL_PADDING * 2
      maxWidth = Math.max(maxWidth, reqWidth)
    }

    if (context.parsedKeywords.length > 0) {
      const keywordsText = getMatchingKeywordsText(node, context.parsedKeywords)
      if (keywordsText.length > 0) {
        const keywordsWidth =
          measureTalentTextWidth(keywordsText, 'default') + TEXT.HORIZONTAL_PADDING * 2
        maxWidth = Math.max(maxWidth, keywordsWidth)
      }
    }

    return maxWidth
  }

  return NODE.WIDTH
}

// ============================================================================
// Height Calculation
// ============================================================================

/**
 * Calculate dynamic node height based on talent node content
 */
const _getNodeHeight = (
  node: HierarchicalTalentTreeNode,
  width: number,
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
      const maxTextWidth = width - TEXT.HORIZONTAL_PADDING * 2
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

export const getNodeDimensions = (
  node: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): [number, number] => {
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

  const nodeWidth = cached?.width ?? _getNodeWidth(node, context)
  const nodeHeight = cached?.height ?? _getNodeHeight(node, nodeWidth, context)

  return [nodeWidth, nodeHeight]
}

export const getNodeWidth = (
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

  return cached?.width ?? _getNodeWidth(node, context)
}

export const getNodeHeight = (
  node: HierarchicalTalentTreeNode,
  width: number,
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

  return cached?.height ?? _getNodeHeight(node, width, context)
}

export const cacheAllNodeDimensions = (
  rootNode: HierarchicalTalentTreeNode,
  context: TalentRenderingContext
): void => {
  buildCache(rootNode, context, _getNodeWidth, _getNodeHeight)
}
