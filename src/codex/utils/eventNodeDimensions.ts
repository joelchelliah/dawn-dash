import {
  EventTreeNode,
  DialogueNode,
  EndNode,
  CombatNode,
  SpecialNode,
  ChoiceNode,
  ResultNode,
  Event,
} from '@/codex/types/events'
import { TEXT, INNER_BOX, NODE, NODE_BOX } from '@/codex/constants/eventTreeValues'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import { measureEventTextWidth, wrapEventText } from './eventTextWidthEstimation'
import { getCachedDimensions, buildDimensionCache as buildCache } from './eventNodeDimensionCache'

/**
 * Node lookup map type for O(1) access to nodes by ID
 */
export type NodeMap = Map<number, EventTreeNode>

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Type guard for nodes that can have text content
 */
export const isTextNode = (
  node: EventTreeNode
): node is DialogueNode | EndNode | CombatNode | SpecialNode => {
  return (
    node.type === 'dialogue' ||
    node.type === 'end' ||
    node.type === 'combat' ||
    node.type === 'special'
  )
}

/**
 * Type guard for nodes that can have effects
 */
export const isEffectsNode = (
  node: EventTreeNode
): node is DialogueNode | EndNode | CombatNode | SpecialNode => {
  return (
    node.type === 'end' ||
    node.type === 'dialogue' ||
    node.type === 'combat' ||
    node.type === 'special'
  )
}

/**
 * Type guard for nodes that can have requirements
 */
export const isRequirementsNode = (node: EventTreeNode): node is ChoiceNode | ResultNode => {
  return node.type === 'choice' || node.type === 'result'
}

/**
 * Check if a node has non-empty text content
 */
export const hasText = (node: EventTreeNode): boolean => {
  if (!isTextNode(node)) return false

  const text = (node.text || '').trim()
  return text.length > 0 && text !== 'default'
}

export const hasChoiceLabel = (node: EventTreeNode): boolean => {
  if (node.type !== 'choice') return false

  const choiceLabel = (node.choiceLabel || '').trim()
  return choiceLabel.length > 0 && choiceLabel !== 'default'
}

/**
 * Check if a node has effects
 */
export const hasEffects = (node: EventTreeNode): boolean => {
  return isEffectsNode(node) && (node.effects ?? []).length > 0
}

/**
 * Check if a node has requirements
 */
export const hasRequirements = (node: EventTreeNode): boolean => {
  return isRequirementsNode(node) && (node.requirements ?? []).length > 0
}

/**
 * Check if a node has continues
 */
export const hasContinues = (node: EventTreeNode): node is DialogueNode => {
  return node.type === 'dialogue' && Boolean(node.numContinues)
}

/**
 * Check if a node has merchant effects
 */
export const hasMerchantEffects = (node: EventTreeNode): boolean => {
  const merchantEffects = ['BUYCARDBYCATEGORY: potion', 'MERCHANT']
  return (
    isEffectsNode(node) && (node.effects ?? []).some((effect) => merchantEffects.includes(effect))
  )
}

/**
 * Get text or choice label from a node
 */
export const getNodeTextOrChoiceLabel = (node: EventTreeNode | undefined): string | undefined => {
  if (!node) return undefined
  if (node.type === 'choice') return node.choiceLabel
  if (node.type === 'result') return undefined
  return node.text
}

// ============================================================================
// Width Calculation Helpers
// ============================================================================

/**
 * Measures text width with padding applied
 */
const measureWithPadding = (
  text: string,
  paddingMultiplier: number,
  variant?: 'choice' | 'special' | 'indicatorHeader'
): number => {
  return measureEventTextWidth(text, variant) + paddingMultiplier
}

/**
 * Calculates the width needed for a list of items (requirements or effects)
 */
const calculateListingsWidth = (items: string[]): number => {
  if (items.length === 0) return 0

  const marginAndPadding = INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  const widestItemWidth = items.reduce(
    (maxWidth, item) => Math.max(maxWidth, measureEventTextWidth(item)),
    0
  )

  return widestItemWidth + marginAndPadding
}

/**
 * Generates indicator text based on type and mode
 */
const getIndicatorText = (
  type: 'loop' | 'continue',
  isCompact: boolean,
  refLabel?: string,
  count?: number
): string => {
  if (type === 'loop') {
    return isCompact ? `🔄 ${refLabel || ''}` : '🔄 Loops back to:'
  } else {
    return isCompact ? `⏭️ × ${count}` : `⏭️ Continues: ${count}`
  }
}

/**
 * Clamps node width to min/max range
 */
const clampNodeWidth = (width: number, isCompact: boolean): number => {
  return Math.max(
    isCompact ? NODE.COMPACT_WIDTH : NODE.WIDTH_RANGE[0],
    Math.min(width, NODE.WIDTH_RANGE[1])
  )
}

// ============================================================================
// Box Dimension Calculations
// ============================================================================

/**
 * Calculates the effects box height and margin for nodes that can have effects.
 * Returns both the height of the effects box and the margin to add above it.
 */
export const calculateEffectsBoxDimensions = (
  node: DialogueNode | EndNode | CombatNode | SpecialNode,
  nodeWidth: number,
  isCompact: boolean,
  followsText: boolean
): { height: number; margin: number } => {
  const maxNodeEffectWidth = nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  const headerHeight = isCompact ? 0 : TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP
  const effectLines = (node.effects || []).flatMap((effect: string) =>
    wrapEventText(effect, maxNodeEffectWidth)
  )
  const height =
    effectLines.length > 0
      ? headerHeight +
        effectLines.length * TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_VERTICAL_PADDING * 2
      : 0

  const margin = followsText && height > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

  return { height, margin }
}

/**
 * Calculates the requirements box height and margin for nodes that can have requirements.
 * Returns both the height of the requirements box and the margin to add above it.
 */
export const calculateRequirementsBoxDimensions = (
  node: ChoiceNode | ResultNode,
  followsText: boolean
): { height: number; margin: number } => {
  const requirements = node.requirements || []
  const height =
    requirements.length > 0
      ? TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_HEADER_GAP +
        requirements.length * TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_VERTICAL_PADDING
      : 0

  const margin = followsText && height > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

  return { height, margin }
}

/**
 * Calculates the indicator height and margin for dialogue nodes.
 * Covers both the "Loops back to" and "Continue" indicators.
 */
export const calculateIndicatorDimensions = (
  type: 'loop' | 'continue',
  hasIndicator: boolean,
  followsText: boolean,
  followsOtherBoxes: boolean
): { height: number; margin: number } => {
  if (!hasIndicator) {
    return { height: 0, margin: 0 }
  }

  let height = 0
  if (type === 'continue') {
    height = INNER_BOX.INDICATOR_HEIGHT
  } else if (type === 'loop') {
    height = followsText
      ? INNER_BOX.INDICATOR_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP + TEXT.LINE_HEIGHT
      : INNER_BOX.INDICATOR_HEIGHT
  }

  const margin = followsText || followsOtherBoxes ? INNER_BOX.INDICATOR_TOP_MARGIN : 0

  return { height, margin }
}

/**
 * Tweaks loop indicator height for choice nodes in compact mode
 */
export const tweakLoopIndicatorHeightForChoiceNode = (
  height: number,
  isCompact: boolean
): number => {
  if (!isCompact) return height
  return height > 0 ? height - INNER_BOX.INDICATOR_HEADER_GAP - TEXT.LINE_HEIGHT : 0
}

/**
 * Calculates text dimensions for a node
 */
interface TextDimensions {
  height: number
  hasText: boolean
}

const calculateTextDimensions = (
  node: EventTreeNode,
  maxWidth: number,
  levelOfDetail: LevelOfDetail
): TextDimensions => {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  const maxDisplayLines = TEXT.MAX_DISPLAY_LINES_BY_LEVEL_OF_DETAIL[levelOfDetail]

  if (node.type === 'choice') {
    if (node.choiceLabel === 'default') {
      return {
        height: 0,
        hasText: false,
      }
    }
    const choiceLines = wrapEventText(node.choiceLabel, maxWidth, 'choice')
    return {
      height: choiceLines.length * TEXT.CHOICE_TEXT_HEIGHT,
      hasText: true,
    }
  }

  if (node.type === 'result') return { height: 0, hasText: false }

  if (isCompact || !hasText(node)) return { height: 0, hasText: false }

  // Calculate actual text height
  const textContent = node.text ?? ''
  const variant = node.type === 'special' ? 'special' : undefined
  const lines = wrapEventText(textContent, maxWidth, variant)
  const numLines = Math.min(lines.length, maxDisplayLines)
  const lineHeight = node.type === 'special' ? TEXT.SPECIAL_TEXT_HEIGHT : TEXT.LINE_HEIGHT

  return {
    height: numLines * lineHeight,
    hasText: true,
  }
}

/**
 * Gets the additional margin a node requires to avoid text colliding with its emoji badge.
 */
export const getEmojiMargin = (node: EventTreeNode, levelOfDetail: LevelOfDetail): number => {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  const hasOnlyInnerBoxAndIsNotCompact =
    (hasEffects(node) || hasRequirements(node)) && !isCompact && !hasText(node)

  let emojiMargin: number
  if (node.type === 'choice') {
    emojiMargin = 0
  } else if (hasOnlyInnerBoxAndIsNotCompact) {
    emojiMargin = 0
  } else {
    emojiMargin = NODE_BOX.EMOJI_MARGIN_BY_LEVEL_OF_DETAIL[levelOfDetail]
  }

  return emojiMargin
}

// ============================================================================
// Main Dimension Calculation Functions
// ============================================================================

/**
 * Get node dimensions with caching support
 */
export const getNodeDimensions = (
  nodeMap: NodeMap,
  node: EventTreeNode,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): [number, number] => {
  const cached = getCachedDimensions(event.name, node.id, showLoopingIndicator, levelOfDetail)
  const nodeWidth =
    cached?.width ?? _getNodeWidth(nodeMap, node, showLoopingIndicator, levelOfDetail)
  const nodeHeight =
    cached?.height ?? _getNodeHeight(node, nodeWidth, showLoopingIndicator, levelOfDetail)

  return [nodeWidth, nodeHeight]
}

/**
 * Get node width with caching support
 */
export const getNodeWidth = (
  nodeMap: NodeMap,
  node: EventTreeNode,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number =>
  getCachedDimensions(event.name, node.id, showLoopingIndicator, levelOfDetail)?.width ??
  _getNodeWidth(nodeMap, node, showLoopingIndicator, levelOfDetail)

/**
 * Get node height with caching support
 */
export const getNodeHeight = (
  node: EventTreeNode,
  event: Event,
  width: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number =>
  getCachedDimensions(event.name, node.id, showLoopingIndicator, levelOfDetail)?.height ??
  _getNodeHeight(node, width, showLoopingIndicator, levelOfDetail)

/**
 * Cache all node dimensions for better performance
 */
export const cacheAllNodeDimensions = (
  nodeMap: NodeMap,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): void => {
  buildCache(nodeMap, event, showLoopingIndicator, levelOfDetail, _getNodeWidth, _getNodeHeight)
}

/**
 * Calculate dynamic node width based on event node content
 */
const _getNodeWidth = (
  nodeMap: NodeMap,
  node: EventTreeNode,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number => {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  const numContinues = node.type === 'dialogue' ? (node.numContinues ?? 0) : 0

  const totalTextPadding = TEXT.HORIZONTAL_PADDING * 2
  const totalInnerBoxMarginAndPadding = INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4

  let width = isCompact ? NODE.COMPACT_WIDTH : NODE.WIDTH_RANGE[0]

  // Loop indicator width
  if (showLoopingIndicator && node.ref !== undefined) {
    const refNode = nodeMap.get(node.ref)
    const refNodeLabel = getNodeTextOrChoiceLabel(refNode)
    const text = getIndicatorText('loop', isCompact, refNodeLabel)
    const loopIndicatorTextWidth = measureWithPadding(
      text,
      totalInnerBoxMarginAndPadding,
      'indicatorHeader'
    )
    width = Math.max(width, clampNodeWidth(loopIndicatorTextWidth, isCompact))
  }

  // Continue indicator width
  if (numContinues > 0) {
    const text = getIndicatorText('continue', isCompact, undefined, numContinues)
    const continueTextWidth = measureWithPadding(
      text,
      totalInnerBoxMarginAndPadding,
      'indicatorHeader'
    )
    width = Math.max(width, clampNodeWidth(continueTextWidth, isCompact))
  }

  // Dialogue text width
  const dialogueText = hasText(node)
    ? (node as DialogueNode | EndNode | CombatNode | SpecialNode).text
    : ''
  if (dialogueText && !isCompact) {
    const dialogueTextWidth = measureWithPadding(dialogueText, totalTextPadding)
    width = Math.max(width, clampNodeWidth(dialogueTextWidth, isCompact))
  }

  // Choice label width
  const choiceLabel = node.type === 'choice' ? node.choiceLabel : ''
  if (choiceLabel) {
    const choiceLabelWidth = measureWithPadding(choiceLabel, totalTextPadding, 'choice')
    const choiceLabelMaxWidth = isCompact
      ? Math.min(TEXT.COMPACT_CHOICE_TEXT_MAX_WIDTH, choiceLabelWidth)
      : choiceLabelWidth
    width = Math.max(width, clampNodeWidth(choiceLabelMaxWidth, isCompact))
  }

  // Requirements width
  if (isRequirementsNode(node) && node.requirements) {
    const requirementWidth = calculateListingsWidth(node.requirements)
    if (requirementWidth > 0) {
      width = Math.max(width, clampNodeWidth(requirementWidth, isCompact))
    }
  }

  // Effects width
  if (isEffectsNode(node) && node.effects) {
    const effectWidth = calculateListingsWidth(node.effects)
    if (effectWidth > 0) {
      width = Math.max(width, clampNodeWidth(effectWidth, isCompact))
    }
  }

  return width
}

/**
 * Calculate dynamic node height based on event node content
 */
const _getNodeHeight = (
  node: EventTreeNode,
  width: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number => {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  const emojiMargin = getEmojiMargin(node, levelOfDetail)
  const maxNodeTextWidth = width - TEXT.HORIZONTAL_PADDING * 2

  const textDimensions = calculateTextDimensions(node, maxNodeTextWidth, levelOfDetail)

  if (node.type === 'choice') {
    const { height: reqBoxHeight, margin: reqBoxMarginBase } = calculateRequirementsBoxDimensions(
      node,
      textDimensions.hasText
    )
    // Since choice labels have such a large height we can use a smaller margin for the requirements box
    const reqBoxMargin = reqBoxMarginBase / 2

    const { height: loopIndicatorHeightBase, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        textDimensions.hasText,
        reqBoxHeight > 0
      )

    const loopIndicatorHeight = tweakLoopIndicatorHeightForChoiceNode(
      loopIndicatorHeightBase,
      isCompact
    )

    const contentHeight =
      textDimensions.height +
      reqBoxMargin +
      reqBoxHeight +
      loopIndicatorHeight +
      loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  }

  if (node.type === 'result') {
    const { height: reqBoxHeight, margin: reqBoxMargin } = calculateRequirementsBoxDimensions(
      node,
      false
    )
    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        false,
        reqBoxHeight > 0
      )

    const contentHeight = reqBoxMargin + reqBoxHeight + loopIndicatorHeight + loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  }

  // For dialogue, end, combat, and special nodes
  if (isEffectsNode(node)) {
    const { height: effectsBoxHeight, margin: effectsBoxMargin } = calculateEffectsBoxDimensions(
      node,
      width,
      isCompact,
      textDimensions.hasText
    )

    const { height: continueIndicatorHeight, margin: continueIndicatorMargin } =
      node.type === 'dialogue'
        ? calculateIndicatorDimensions(
            'continue',
            Boolean(node.numContinues),
            textDimensions.hasText,
            effectsBoxHeight > 0
          )
        : { height: 0, margin: 0 }

    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        textDimensions.hasText,
        effectsBoxHeight > 0 || continueIndicatorHeight > 0
      )

    const contentHeight =
      textDimensions.height +
      effectsBoxMargin +
      effectsBoxHeight +
      continueIndicatorMargin +
      continueIndicatorHeight +
      loopIndicatorHeight +
      loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  }

  throw new Error(`Unknown type on node: ${JSON.stringify(node)}`)
}
