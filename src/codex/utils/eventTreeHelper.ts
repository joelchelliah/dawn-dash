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
  showLoopingIndicator: boolean
): [number, number] => {
  const cached = getCachedDimensions(event.name, node.id)
  const nodeWidth = cached?.width ?? _getNodeWidth(node, event)
  const nodeHeight = cached?.height ?? _getNodeHeight(node, event, nodeWidth, showLoopingIndicator)

  return [nodeWidth, nodeHeight]
}

export const getNodeWidth = (node: EventTreeNode, event: Event): number =>
  getCachedDimensions(event.name, node.id)?.width ?? _getNodeWidth(node, event)

export const getNodeHeight = (
  node: EventTreeNode,
  event: Event,
  width: number,
  showLoopingIndicator: boolean
): number =>
  getCachedDimensions(event.name, node.id)?.height ??
  _getNodeHeight(node, event, width, showLoopingIndicator)

export const cacheAllNodeDimensions = (event: Event, showLoopingIndicator: boolean): void => {
  buildCache(event, showLoopingIndicator, _getNodeWidth, _getNodeHeight)
}

/**
 * Calculate bounding box for the entire tree based on positioned nodes.
 * Uses cached dimensions when available for better performance.
 */
export const calculateTreeBounds = (
  root: HierarchyNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean
): TreeBounds => {
  let minX = Infinity // Left edge of the leftmost node
  let maxX = -Infinity // Right edge of the rightmost node
  let minY = Infinity // Top edge of the topmost node
  let maxY = -Infinity // Bottom edge of the bottommost node

  root.descendants().forEach((d) => {
    const x = d.x ?? 0
    const y = d.y ?? 0

    const [nodeWidth, nodeHeight] = getNodeDimensions(d.data, event, showLoopingIndicator)

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
const _getNodeWidth = (node: EventTreeNode, _event: Event): number => {
  let width = NODE.WIDTH_RANGE[0]

  const dialogueText = hasText(node) ? node.text : ''
  if (dialogueText) {
    width = Math.max(
      width,
      clampNodeWidth(measureEventTextWidth(dialogueText) + TEXT.HORIZONTAL_PADDING * 2)
    )
  }

  const choiceLabel = node.type === 'choice' ? node.choiceLabel : ''
  if (choiceLabel) {
    width = Math.max(
      width,
      clampNodeWidth(measureEventTextWidth(choiceLabel, 'choice') + TEXT.HORIZONTAL_PADDING * 2)
    )
  }

  const longestRequirement =
    node.type === 'choice'
      ? node.requirements?.reduce(
          (longest, requirement) => (requirement.length > longest.length ? requirement : longest),
          ''
        )
      : undefined

  if (longestRequirement) {
    width = Math.max(
      width,
      clampNodeWidth(
        measureEventTextWidth(longestRequirement) + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
      )
    )
  }

  const longestEffect = hasEffects(node)
    ? node.effects?.reduce(
        (longest, effect) => (effect.length > longest.length ? effect : longest),
        ''
      )
    : undefined

  if (longestEffect) {
    width = Math.max(
      width,
      clampNodeWidth(
        measureEventTextWidth(longestEffect) + INNER_BOX.HORIZONTAL_MARGIN_OR_PADDING * 4
      )
    )
  }

  return width
}

/**
 * Calculate dynamic node height based on event node content
 */
const _getNodeHeight = (
  node: EventTreeNode,
  event: Event,
  width: number,
  showLoopingIndicator: boolean
): number => {
  const isRootNode = event.rootNode && node.id === event.rootNode.id
  const maxNodeTextWidth = width - TEXT.HORIZONTAL_PADDING * 2

  const continueIndicatorHeight = node.numContinues ? INNER_BOX.INDICATOR_HEIGHT : 0
  const continueIndicatorMargin = continueIndicatorHeight > 0 ? INNER_BOX.INDICATOR_TOP_MARGIN : 0
  const loopIndicatorHeight =
    showLoopingIndicator && node.ref
      ? INNER_BOX.INDICATOR_HEIGHT +
        INNER_BOX.INDICATOR_TOP_MARGIN +
        INNER_BOX.INDICATOR_HEADER_GAP +
        TEXT.LINE_HEIGHT
      : 0

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

    const contentHeight =
      choiceTextHeight +
      reqBoxMargin +
      reqBoxHeight +
      continueIndicatorMargin +
      continueIndicatorHeight +
      loopIndicatorHeight

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'end') {
    // End nodes have special cases:
    // - Has text: show up to 2 lines of text + effects box (if present)
    // - No text but has effects: only show effects box (no text area)
    // - No text and no effects: show "END" (1 line)
    const hasText = node.text && node.text.trim().length > 0
    const effects = node.effects || []
    const hasEffects = effects.length > 0

    const effectsBoxHeight = hasEffects
      ? TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_HEADER_GAP +
        effects.length * TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_VERTICAL_PADDING
      : 0

    let textHeight: number
    let effectsBoxMargin: number

    if (!hasText && hasEffects) {
      // No text, only effects box - no margin needed
      textHeight = 0
      effectsBoxMargin = 0
    } else if (!hasText && !hasEffects) {
      // No text, no effects: show "END" (1 line)
      textHeight = TEXT.COMBAT_TEXT_HEIGHT
      effectsBoxMargin = 0
    } else {
      const endLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
      const numLines = Math.min(endLines.length, TEXT.MAX_DISPLAY_LINES)
      textHeight = numLines * TEXT.LINE_HEIGHT
      // Only add margin if we have both text and effects box
      effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0
    }

    const contentHeight = textHeight + effectsBoxMargin + effectsBoxHeight + loopIndicatorHeight

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'dialogue') {
    // Dialogue nodes show up to 2 lines of dialogue text + effects box (if present) + continue box (if present) + loops back to box (if present)
    // Event name is now displayed ABOVE the root node, not inside it
    const effects = node.effects || []
    const hasEffects = effects.length > 0
    const effectsBoxHeight = hasEffects
      ? TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_HEADER_GAP +
        effects.length * TEXT.LINE_HEIGHT +
        INNER_BOX.LISTINGS_VERTICAL_PADDING
      : 0
    const effectsBoxMargin = effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

    if (isRootNode) {
      // Add dialogue text if present (up to 2 lines)
      const hasText = node.text && node.text.trim().length > 0
      let dialogueTextHeight = 0

      if (hasText) {
        const dialogueLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
        const numLines = Math.min(dialogueLines.length, TEXT.MAX_DISPLAY_LINES)
        dialogueTextHeight = numLines * TEXT.LINE_HEIGHT
      }

      const contentHeight =
        dialogueTextHeight +
        (dialogueTextHeight > 0 ? effectsBoxMargin : 0) +
        effectsBoxHeight +
        continueIndicatorMargin +
        continueIndicatorHeight +
        loopIndicatorHeight

      return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
    }

    const dialogueLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
    const numLines = Math.min(dialogueLines.length, TEXT.MAX_DISPLAY_LINES)
    const textHeight = numLines * TEXT.LINE_HEIGHT

    const contentHeight =
      textHeight +
      (textHeight > 0 ? effectsBoxMargin : 0) +
      effectsBoxHeight +
      continueIndicatorMargin +
      continueIndicatorHeight +
      loopIndicatorHeight

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'combat') {
    // Combat nodes show text (up to 2 lines) or "COMBAT!" fallback + effects box (if any) + loops back to box (if present)
    const hasText = node.text && node.text.trim().length > 0
    let textHeight: number

    if (hasText && node.text) {
      const combatLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
      const numLines = Math.min(combatLines.length, TEXT.MAX_DISPLAY_LINES)
      textHeight = numLines * TEXT.LINE_HEIGHT
    } else {
      // Fallback to "COMBAT!" text
      textHeight = TEXT.COMBAT_TEXT_HEIGHT
    }

    const effectsBoxHeight =
      node.effects && node.effects.length > 0
        ? TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          node.effects.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING
        : 0
    const effectsBoxMargin =
      textHeight > 0 && effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

    const contentHeight = textHeight + effectsBoxMargin + effectsBoxHeight + loopIndicatorHeight

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  } else if (node.type === 'special') {
    // Special nodes show text (up to 2 lines) + effects box (if any) + loops back to box (if present)
    const hasText = node.text && node.text.trim().length > 0
    let textHeight: number

    if (hasText && node.text) {
      const specialLines = wrapEventText(node.text ?? '', maxNodeTextWidth)
      const numLines = Math.min(specialLines.length, TEXT.MAX_DISPLAY_LINES)
      textHeight = numLines * TEXT.LINE_HEIGHT
    } else {
      textHeight = 0
    }

    const effectsBoxHeight =
      node.effects && node.effects.length > 0
        ? TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_HEADER_GAP +
          node.effects.length * TEXT.LINE_HEIGHT +
          INNER_BOX.LISTINGS_VERTICAL_PADDING
        : 0
    const effectsBoxMargin =
      textHeight > 0 && effectsBoxHeight > 0 ? INNER_BOX.LISTINGS_TOP_MARGIN : 0

    const contentHeight = textHeight + effectsBoxMargin + effectsBoxHeight + loopIndicatorHeight

    return contentHeight + NODE_BOX.VERTICAL_PADDING * 2
  }

  throw new Error(`Unknown type on node: ${node}`)
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

/**
 * Type guard that checks if a node is one of the types that can have effects
 * and has at least one effect in its effects array.
 */
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
  root && id ? root.descendants().find((d) => d.data.id === id)?.data : undefined

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

const clampNodeWidth = (width: number): number => {
  return Math.max(NODE.WIDTH_RANGE[0], Math.min(width, NODE.WIDTH_RANGE[1]))
}
