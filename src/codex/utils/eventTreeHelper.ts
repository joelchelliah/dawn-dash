import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy'
import { Selection } from 'd3-selection'

import {
  Event,
  EventTreeNode,
  DialogueNode,
  EndNode,
  CombatNode,
  SpecialNode,
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

export const getNodeDimensions = (
  node: EventTreeNode,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): [number, number] => {
  const cached = getCachedDimensions(event.name, node.id, showLoopingIndicator, levelOfDetail)
  const nodeWidth = cached?.width ?? _getNodeWidth(node, showLoopingIndicator, levelOfDetail)
  const nodeHeight =
    cached?.height ?? _getNodeHeight(node, nodeWidth, showLoopingIndicator, levelOfDetail)

  return [nodeWidth, nodeHeight]
}

export const getNodeWidth = (
  node: EventTreeNode,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number =>
  getCachedDimensions(event.name, node.id, showLoopingIndicator, levelOfDetail)?.width ??
  _getNodeWidth(node, showLoopingIndicator, levelOfDetail)

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
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): void => {
  buildCache(event, showLoopingIndicator, levelOfDetail, _getNodeWidth, _getNodeHeight)
}

/**
 * Calculate bounding box for the entire tree based on positioned nodes.
 * Uses cached dimensions when available for better performance.
 */
export const calculateTreeBounds = (
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
  node: EventTreeNode,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail
): number => {
  const isCompact = levelOfDetail === LevelOfDetail.COMPACT
  const numContinues = node.type === 'dialogue' ? (node.numContinues ?? 0) : 0

  let width = isCompact ? NODE.COMPACT_WIDTH : NODE.WIDTH_RANGE[0]

  if (showLoopingIndicator && node.ref !== undefined) {
    width = Math.max(
      width,
      clampNodeWidth(
        measureEventTextWidth('🔄 Loops back to:', 'indicatorHeader') +
          INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4,
        isCompact
      )
    )
  }

  if (numContinues > 0) {
    const text = isCompact ? `⏭️ × ${numContinues}` : `⏭️ Continues: ${numContinues}`
    width = Math.max(
      width,
      clampNodeWidth(
        measureEventTextWidth(text, 'indicatorHeader') + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4,
        isCompact
      )
    )
  }

  const dialogueText = hasText(node) ? node.text : ''
  if (dialogueText && !isCompact) {
    width = Math.max(
      width,
      clampNodeWidth(measureEventTextWidth(dialogueText) + TEXT.HORIZONTAL_PADDING * 2, isCompact)
    )
  }

  const choiceLabel = node.type === 'choice' ? node.choiceLabel : ''
  if (choiceLabel) {
    width = Math.max(
      width,
      clampNodeWidth(
        measureEventTextWidth(choiceLabel, 'choice') + TEXT.HORIZONTAL_PADDING * 2,
        isCompact
      )
    )
  }

  const widestRequirementWidth =
    node.type === 'choice' || node.type === 'result'
      ? (node.requirements?.reduce(
          (maxWidth, requirement) => Math.max(maxWidth, measureEventTextWidth(requirement)),
          0
        ) ?? 0)
      : 0

  if (widestRequirementWidth > 0) {
    width = Math.max(
      width,
      clampNodeWidth(widestRequirementWidth + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4, isCompact)
    )
  }

  const widestEffectWidth = hasEffects(node)
    ? (node.effects?.reduce(
        (maxWidth, effect) => Math.max(maxWidth, measureEventTextWidth(effect)),
        0
      ) ?? 0)
    : 0

  if (widestEffectWidth > 0) {
    width = Math.max(
      width,
      clampNodeWidth(widestEffectWidth + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4, isCompact)
    )
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

  const maxNodeTextWidth = width - TEXT.HORIZONTAL_PADDING * 2
  const maxDisplayLines = TEXT.MAX_DISPLAY_LINES_BY_LEVEL_OF_DETAIL[levelOfDetail]

  if (node.type === 'choice') {
    const requirements = node.requirements || []
    const choiceLines = wrapEventText(node.choiceLabel, maxNodeTextWidth, 'choice')

    const choiceTextHeight = choiceLines.length * TEXT.CHOICE_TEXT_HEIGHT
    const reqBoxHeight =
      requirements.length > 0
        ? TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          requirements.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING
        : 0
    const reqBoxMargin = reqBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        choiceTextHeight > 0,
        reqBoxHeight > 0
      )

    const contentHeight =
      choiceTextHeight + reqBoxMargin + reqBoxHeight + loopIndicatorHeight + loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'end') {
    const hasText = Boolean(!isCompact && node.text && node.text.trim().length > 0)
    const { effectsBoxHeight, effectsBoxMargin } = calculateEffectsBoxDimensions(
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

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'dialogue') {
    const hasText = Boolean(!isCompact && node.text && node.text.trim().length > 0)

    const { effectsBoxHeight, effectsBoxMargin } = calculateEffectsBoxDimensions(
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

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'combat') {
    const hasText = Boolean(!isCompact && node.text && node.text.trim().length > 0)
    let textHeight = 0

    if (hasText) {
      const combatLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
      const numLines = Math.min(combatLines.length, maxDisplayLines)
      textHeight = numLines * TEXT.LINE_HEIGHT
    } else if (!isCompact) {
      // Fallback to "FIGHT!" text
      textHeight = TEXT.REPLACED_TEXT_HEIGHT
    }

    const { effectsBoxHeight, effectsBoxMargin } = calculateEffectsBoxDimensions(
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

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
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

    const { effectsBoxHeight, effectsBoxMargin } = calculateEffectsBoxDimensions(
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

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'result') {
    const requirements = node.requirements || []

    const reqBoxHeight =
      requirements.length > 0
        ? TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          requirements.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING
        : 0
    const { height: loopIndicatorHeight, margin: loopIndicatorMargin } =
      calculateIndicatorDimensions(
        'loop',
        Boolean(showLoopingIndicator && node.ref !== undefined),
        false,
        reqBoxHeight > 0
      )

    const contentHeight = reqBoxHeight + loopIndicatorHeight + loopIndicatorMargin

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
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
): { effectsBoxHeight: number; effectsBoxMargin: number } => {
  const maxNodeEffectWidth = nodeWidth - INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
  // Because we don't show the "Effect:" header in compact mode
  const headerHeight = isCompact ? 0 : TEXT.LINE_HEIGHT + INNER_BOX.LISTINGS_HEADER_GAP
  const effectLines = (node.effects || []).flatMap((effect: string) =>
    wrapEventText(effect, maxNodeEffectWidth)
  )
  const effectsBoxHeight =
    effectLines.length > 0
      ? headerHeight +
        effectLines.length * TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_VERTICAL_PADDING * 2
      : 0
  let effectsBoxMargin = 0
  if (followsText && effectsBoxHeight > 0) {
    effectsBoxMargin = INNER_BOX.LISTINGS_TOP_MARGIN
  } else if (isCompact && effectsBoxHeight > 0) {
    effectsBoxMargin = INNER_BOX.LISTINGS_TOP_MARGIN_COMPACT
  }

  return { effectsBoxHeight, effectsBoxMargin }
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

  const height =
    type === 'loop'
      ? INNER_BOX.INDICATOR_HEIGHT + INNER_BOX.INDICATOR_HEADER_GAP + TEXT.LINE_HEIGHT
      : INNER_BOX.INDICATOR_HEIGHT

  const margin =
    followsText || followsOtherBoxes
      ? INNER_BOX.INDICATOR_TOP_MARGIN
      : INNER_BOX.INDICATOR_TOP_MARGIN_COMPACT

  return { height, margin }
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
 * Calculate the arrowhead angle based on horizontal displacement between nodes.
 *
 * Uses a self-limiting rational function: tiltFactor = |dx| / (750 + |dx|)
 * This creates smooth, organic angle adjustments where the tilt asymptotically
 * approaches maxTilt but never quite reaches it, providing natural diminishing
 * returns as distance increases.
 */
export const getArrowheadAngle = (dx: number): number => {
  if (dx === 0) {
    return 90 // Straight down
  }

  const maxTilt = 45
  const baseDivisor = 750
  const adjustedDivisor = baseDivisor + Math.abs(dx)
  const tiltFactor = Math.abs(dx) / adjustedDivisor
  const tilt = tiltFactor * maxTilt

  // If target is to the right, tilt right (angle < 90); if left, tilt left (angle > 90)
  return dx > 0 ? 90 - tilt : 90 + tilt
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
export const isCompactEmojiBadgeNode = (node: EventTreeNode, isCompact: boolean): boolean =>
  isCompact && ['dialogue', 'end', 'combat', 'special', 'result'].includes(node.type)

/**
 * Checks if this node is only represented by an emoji during Compact mode.
 */
export const isCompactEmojiOnlyNode = (
  node: EventTreeNode,
  isCompact: boolean,
  showLoopingIndicator: boolean
): boolean =>
  isCompactEmojiBadgeNode(node, isCompact) &&
  !hasRequirements(node) &&
  !hasEffects(node) &&
  !hasContinues(node) &&
  !(hasLoopingRef(node) && showLoopingIndicator)
