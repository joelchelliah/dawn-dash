import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy'
import { Selection } from 'd3-selection'

import {
  Event,
  EventTreeNode,
  DialogueNode,
  EndNode,
  CombatNode,
  SpecialNode,
  ResultNode,
  ChoiceNode,
} from '@/codex/types/events'
import { TEXT, INNER_BOX, NODE, NODE_BOX } from '@/codex/constants/eventTreeValues'

import { LevelOfDetail } from '../constants/eventSearchValues'

import { measureEventTextWidth, wrapEventText } from './eventTextWidthEstimation'
import { getCachedDimensions, buildDimensionCache as buildCache } from './eventNodeDimensionCache'

interface TreeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

/**
 * Node lookup map type for O(1) access to nodes by ID
 */
export type NodeMap = Map<number, EventTreeNode>

/**
 * Builds a map of node id -> node data for quick O(1) lookup.
 * This is more efficient than traversing the tree hierarchy for each lookup.
 */
export const buildNodeMap = (root: HierarchyPointNode<EventTreeNode>): NodeMap => {
  const nodeMap = new Map<number, EventTreeNode>()
  root.descendants().forEach((node) => {
    nodeMap.set(node.data.id, node.data)
  })
  return nodeMap
}

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

export const getNodeWidth = (
  nodeMap: NodeMap,
  node: EventTreeNode,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number =>
  getCachedDimensions(event.name, node.id, showLoopingIndicator, levelOfDetail)?.width ??
  _getNodeWidth(nodeMap, node, showLoopingIndicator, levelOfDetail)

export const getNodeHeight = (
  node: EventTreeNode,
  event: Event,
  width: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number =>
  getCachedDimensions(event.name, node.id, showLoopingIndicator, levelOfDetail)?.height ??
  _getNodeHeight(node, width, showLoopingIndicator, levelOfDetail)

export const cacheAllNodeDimensions = (
  nodeMap: NodeMap,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): void => {
  buildCache(nodeMap, event, showLoopingIndicator, levelOfDetail, _getNodeWidth, _getNodeHeight)
}

/**
 * Calculate bounding box for the entire tree based on positioned nodes.
 * Uses cached dimensions when available for better performance.
 */
export const calculateTreeBounds = (
  nodeMap: NodeMap,
  root: HierarchyNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): TreeBounds => {
  let minX = Infinity // Left edge of the leftmost node
  let maxX = -Infinity // Right edge of the rightmost node
  let minY = Infinity // Top edge of the topmost node
  let maxY = -Infinity // Bottom edge of the bottommost node

  root.descendants().forEach((d) => {
    const x = d.x ?? 0
    const y = d.y ?? 0

    const [nodeWidth, nodeHeight] = getNodeDimensions(
      nodeMap,
      d.data,
      event,
      showLoopingIndicator,
      levelOfDetail
    )

    // Track edges for both X and Y
    if (x - nodeWidth / 2 < minX) minX = x - nodeWidth / 2
    if (x + nodeWidth / 2 > maxX) maxX = x + nodeWidth / 2
    if (y - nodeHeight / 2 < minY) minY = y - nodeHeight / 2
    if (y + nodeHeight / 2 > maxY) maxY = y + nodeHeight / 2
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
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

  let width = isCompact ? NODE.COMPACT_WIDTH : NODE.WIDTH_RANGE[0]

  if (showLoopingIndicator && node.ref !== undefined) {
    const refNode = nodeMap.get(node.ref)
    const refNodeLabel = getNodeTextOrChoiceLabel(refNode)
    const text = isCompact ? `🔄 ${refNodeLabel || ''}` : '🔄 Loops back to:'
    const loopIndicatorTextWidth =
      measureEventTextWidth(text, 'indicatorHeader') + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4

    width = Math.max(width, clampNodeWidth(loopIndicatorTextWidth, isCompact))
  }

  if (numContinues > 0) {
    const text = isCompact ? `⏭️ × ${numContinues}` : `⏭️ Continues: ${numContinues}`
    const continueTextWidth =
      measureEventTextWidth(text, 'indicatorHeader') + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4

    width = Math.max(width, clampNodeWidth(continueTextWidth, isCompact))
  }

  const dialogueText = hasText(node) ? node.text : ''
  if (dialogueText && !isCompact) {
    const dialogueTextWidth = measureEventTextWidth(dialogueText) + TEXT.HORIZONTAL_PADDING * 2
    width = Math.max(width, clampNodeWidth(dialogueTextWidth, isCompact))
  }

  const choiceLabel = node.type === 'choice' ? node.choiceLabel : ''
  if (choiceLabel) {
    const choiceLabelWidth =
      measureEventTextWidth(choiceLabel, 'choice') + TEXT.HORIZONTAL_PADDING * 2
    const choiceLabelMaxWidth = isCompact
      ? Math.min(TEXT.COMPACT_CHOICE_TEXT_MAX_WIDTH, choiceLabelWidth)
      : choiceLabelWidth
    width = Math.max(width, clampNodeWidth(choiceLabelMaxWidth, isCompact))
  }

  const widestRequirementWidth =
    node.type === 'choice' || node.type === 'result'
      ? (node.requirements?.reduce(
          (maxWidth, requirement) => Math.max(maxWidth, measureEventTextWidth(requirement)),
          0
        ) ?? 0)
      : 0

  if (widestRequirementWidth > 0) {
    const requirementWidth = widestRequirementWidth + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
    width = Math.max(width, clampNodeWidth(requirementWidth, isCompact))
  }

  const widestEffectWidth = hasEffects(node)
    ? (node.effects?.reduce(
        (maxWidth, effect) => Math.max(maxWidth, measureEventTextWidth(effect)),
        0
      ) ?? 0)
    : 0

  if (widestEffectWidth > 0) {
    const effectWidth = widestEffectWidth + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
    width = Math.max(width, clampNodeWidth(effectWidth, isCompact))
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
  const maxDisplayLines = TEXT.MAX_DISPLAY_LINES_BY_LEVEL_OF_DETAIL[levelOfDetail]

  if (node.type === 'choice') {
    const choiceLines = wrapEventText(node.choiceLabel, maxNodeTextWidth, 'choice')
    const choiceTextHeight = choiceLines.length * TEXT.CHOICE_TEXT_HEIGHT

    const { height: reqBoxHeight, margin: reqBoxMarginBase } = calculateRequirementsBoxDimensions(
      node,
      choiceTextHeight > 0
    )

    // Since choice labels have such a large height we can use a smaller margin for the requirements box
    const reqBoxMargin = reqBoxMarginBase / 2

    const { height: loopIndicatorHeightBase, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        choiceTextHeight > 0,
        reqBoxHeight > 0
      )

    const loopIndicatorHeight = tweakLoopIndicatorHeightForChoiceNode(
      loopIndicatorHeightBase,
      isCompact
    )

    const contentHeight =
      choiceTextHeight + reqBoxMargin + reqBoxHeight + loopIndicatorHeight + loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  } else if (node.type === 'end') {
    const hasText = Boolean(!isCompact && node.text && node.text.trim().length > 0)
    const { height: effectsBoxHeight, margin: effectsBoxMargin } = calculateEffectsBoxDimensions(
      node,
      width,
      isCompact,
      hasText
    )

    let textHeight: number

    if (!hasText && effectsBoxHeight > 0) {
      // No text, only effects box
      textHeight = 0
    } else if (!hasText && effectsBoxHeight === 0) {
      // No text, no effects: show "END" (1 line)
      textHeight = TEXT.REPLACED_TEXT_HEIGHT
    } else {
      const endLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
      const numLines = Math.min(endLines.length, maxDisplayLines)

      textHeight = numLines * TEXT.LINE_HEIGHT
    }

    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        hasText,
        effectsBoxHeight > 0
      )

    const contentHeight =
      textHeight + effectsBoxMargin + effectsBoxHeight + loopIndicatorHeight + loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  } else if (node.type === 'dialogue') {
    const hasText = Boolean(!isCompact && node.text && node.text.trim().length > 0)

    const { height: effectsBoxHeight, margin: effectsBoxMargin } = calculateEffectsBoxDimensions(
      node,
      width,
      isCompact,
      hasText
    )

    const { height: continueIndicatorHeight, margin: continueIndicatorMargin } =
      calculateIndicatorDimensions(
        'continue',
        Boolean(node.numContinues),
        hasText,
        effectsBoxHeight > 0
      )

    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        hasText,
        effectsBoxHeight > 0 || continueIndicatorHeight > 0
      )

    const dialogueLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
    const numLines = Math.min(dialogueLines.length, maxDisplayLines)
    const textHeight = numLines * TEXT.LINE_HEIGHT

    const contentHeight =
      textHeight +
      effectsBoxMargin +
      effectsBoxHeight +
      continueIndicatorMargin +
      continueIndicatorHeight +
      loopIndicatorHeight +
      loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  } else if (node.type === 'combat') {
    const hasText = Boolean(!isCompact && node.text && node.text.trim().length > 0)
    let textHeight = 0

    if (hasText) {
      const combatLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
      const numLines = Math.min(combatLines.length, maxDisplayLines)
      textHeight = numLines * TEXT.LINE_HEIGHT
    }

    const { height: effectsBoxHeight, margin: effectsBoxMargin } = calculateEffectsBoxDimensions(
      node,
      width,
      isCompact,
      hasText
    )

    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        hasText,
        effectsBoxHeight > 0
      )

    const contentHeight =
      textHeight + effectsBoxMargin + effectsBoxHeight + loopIndicatorHeight + loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  } else if (node.type === 'special') {
    // Special nodes show text (up to 2 lines) + effects box (if any) + loops back to box (if present)
    const hasText = Boolean(!isCompact && node.text && node.text.trim().length > 0)
    let textHeight: number

    if (hasText && node.text) {
      const specialLines = wrapEventText(node.text ?? '', maxNodeTextWidth, 'special')
      const numLines = Math.min(specialLines.length, maxDisplayLines)
      textHeight = numLines * TEXT.SPECIAL_TEXT_HEIGHT
    } else {
      textHeight = 0
    }

    const { height: effectsBoxHeight, margin: effectsBoxMargin } = calculateEffectsBoxDimensions(
      node,
      width,
      isCompact,
      hasText
    )
    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        hasText,
        effectsBoxHeight > 0
      )

    const contentHeight =
      textHeight + effectsBoxMargin + effectsBoxHeight + loopIndicatorHeight + loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2 + emojiMargin
  } else if (node.type === 'result') {
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

  throw new Error(`Unknown type on node: ${node}`)
}

/**
 * Calculates the effects box height and margin for nodes that can have effects.
 * Returns both the height of the effects box and the margin to add above it.
 */
export const calculateEffectsBoxDimensions = (
  node: DialogueNode | EndNode | CombatNode | SpecialNode,
  nodeWidth: number,
  isCompact: boolean,
  followsText: boolean // Comes after non-empty text
): { height: number; margin: number } => {
  const maxNodeEffectWidth = nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  // Because we don't show the "Effect:" header in compact mode
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
  followsText: boolean // Comes after non-empty text
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
 * - If has text and not compact: always use normal margin
 * - If no text but comes after other boxes: use normal margin
 * - If no text and no other boxes: use compact margin
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

// This is a bit weird for choice nodes, since they always have text,
// even i compact mode, but we want the height here to behave like it's
// not preceded by text... A bit hacky, might need to revisit this later.
// So here we're removing the header gap and extra line height htat was
// added by the `calculateIndicatorDimensions` function.
export const tweakLoopIndicatorHeightForChoiceNode = (
  height: number,
  isCompact: boolean
): number => {
  if (!isCompact) return height

  return height > 0 ? height - INNER_BOX.INDICATOR_HEADER_GAP - TEXT.LINE_HEIGHT : 0
}

const hasText = (
  node: EventTreeNode
): node is DialogueNode | EndNode | CombatNode | SpecialNode => {
  const isTextNode =
    node.type === 'dialogue' ||
    node.type === 'end' ||
    node.type === 'combat' ||
    node.type === 'special'

  return isTextNode && (node.text || '')?.trim().length > 0
}

export const hasMerchantEffects = (node: EventTreeNode): boolean => {
  const isEffectsNode =
    node.type === 'end' ||
    node.type === 'dialogue' ||
    node.type === 'combat' ||
    node.type === 'special'
  const merchantEffects = ['BUYCARDBYCATEGORY: potion', 'MERCHANT']

  return (
    isEffectsNode && (node.effects ?? []).some((effect: string) => merchantEffects.includes(effect))
  )
}

export const hasRequirements = (node: EventTreeNode): boolean => {
  const isRequirementsNode = node.type === 'choice' || node.type === 'result'

  return isRequirementsNode && (node.requirements ?? []).length > 0
}

export const hasEffects = (
  node: EventTreeNode
): node is DialogueNode | EndNode | CombatNode | SpecialNode => {
  const isEffectsNode =
    node.type === 'end' ||
    node.type === 'dialogue' ||
    node.type === 'combat' ||
    node.type === 'special'

  return isEffectsNode && (node.effects ?? []).length > 0
}

export const hasLoopingRef = (node: EventTreeNode): boolean => {
  return Boolean(node.ref !== undefined)
}

export const hasContinues = (node: EventTreeNode): node is DialogueNode => {
  return Boolean(node.type === 'dialogue' && node.numContinues)
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

/**
 * Find a node by ID within the tree
 */
export const findNodeById = (
  root: HierarchyPointNode<EventTreeNode> | undefined,
  id: number | undefined
): EventTreeNode | undefined =>
  root ? root.descendants().find((d) => d.data.id === id)?.data : undefined

export const getNodeTextOrChoiceLabel = (node: EventTreeNode | undefined): string | undefined => {
  if (!node) return undefined
  if (node.type === 'choice') return node.choiceLabel
  if (node.type === 'result') return undefined
  return node.text
}

/**
 * Creates an SVG glow filter for node effects
 */
export const createGlowFilter = (
  defs: Selection<SVGDefsElement, unknown, null, undefined>,
  filterId: string
): void => {
  const blurAmount = '4'
  const filter = defs.append('filter').attr('id', filterId)

  filter.append('feGaussianBlur').attr('stdDeviation', blurAmount).attr('result', 'coloredBlur')

  const merge = filter.append('feMerge')
  merge.append('feMergeNode').attr('in', 'coloredBlur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')
}

const clampNodeWidth = (width: number, isCompact: boolean): number => {
  return Math.max(
    isCompact ? NODE.COMPACT_WIDTH : NODE.WIDTH_RANGE[0],
    Math.min(width, NODE.WIDTH_RANGE[1])
  )
}

/**
 * Checks if this node is drawn with an emoji on top during Compact mode.
 */
export const isEmojiBadgeNode = (node: EventTreeNode): boolean =>
  ['dialogue', 'end', 'combat', 'special', 'result'].includes(node.type)

/**
 * Checks if this node is only represented by an emoji during Compact mode.
 */
export const isCompactEmojiOnlyNode = (
  node: EventTreeNode,
  isCompact: boolean,
  showLoopingIndicator: boolean
): boolean =>
  isCompact &&
  isEmojiBadgeNode(node) &&
  !hasRequirements(node) &&
  !hasEffects(node) &&
  !hasContinues(node) &&
  !(hasLoopingRef(node) && showLoopingIndicator)
