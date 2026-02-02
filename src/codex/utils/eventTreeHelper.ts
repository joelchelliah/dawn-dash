import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy'

import { Event, EventTreeNode } from '@/codex/types/events'

import { LevelOfDetail } from '../constants/eventSearchValues'

import {
  type NodeMap,
  getNodeDimensions,
  hasEffects,
  hasRequirements,
  hasContinues,
  hasText,
  hasChoiceLabel,
  isEffectsNode,
} from './eventNodeDimensions'

interface TreeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

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
 * Find a node by ID within the tree
 */
export const findNodeById = (
  root: HierarchyPointNode<EventTreeNode> | undefined,
  id: number | undefined
): EventTreeNode | undefined =>
  root ? root.descendants().find((d) => d.data.id === id)?.data : undefined

/**
 * Checks if this node is drawn with an emoji on top during Compact mode.
 */
export const isEmojiBadgeNode = (node: EventTreeNode): boolean =>
  ['dialogue', 'end', 'combat', 'special', 'result'].includes(node.type)

/**
 * Checks if this node is only represented by an emoji.
 */
export const isEmojiOnlyNode = (
  node: EventTreeNode,
  isCompact: boolean,
  showLoopingIndicator: boolean
): boolean => {
  const isEmojiOnlyCandidate =
    isEmojiBadgeNode(node) &&
    !hasRequirements(node) &&
    !hasEffects(node) &&
    !hasContinues(node) &&
    !(showLoopingIndicator && node.ref !== undefined)

  return isCompact
    ? isEmojiOnlyCandidate
    : isEmojiOnlyCandidate && !hasText(node) && !hasChoiceLabel(node)
}

/**
 * Get specific emojis for custom nodes
 */
export const getCustomNodeEmoji = (node: EventTreeNode): string | undefined => {
  if (!isEffectsNode(node)) return undefined

  const effects = node.effects ?? []

  if (effects.includes('MERCHANT')) return '🛍️'
  if (effects.includes('BUYCARDBYCATEGORY: potion')) return '🍷'
  if (effects.includes('ENCHANTERIMBUE')) return '🎗️'
  if (effects.includes('TAKEFROMVAULT') || effects.includes('ADDTOVAULT')) return '📦'
  // Custom emoji but keep existing node type
  if (effects.includes('CARDPUZZLE')) return '🧩'
  if (
    effects.includes(
      'random [The Blood Moon, The Final Star, The Hangman, The Hourglass, The Pale Mask, The Wheel]'
    )
  )
    return '🎲'

  return undefined
}

/**
 * Should use custom node type for styling
 */
export const hasCustomNodeType = (node: EventTreeNode): boolean => {
  if (!isEffectsNode(node)) return false
  const effects = node.effects ?? []

  return (
    effects.includes('MERCHANT') ||
    effects.includes('BUYCARDBYCATEGORY: potion') ||
    effects.includes('ENCHANTERIMBUE') ||
    effects.includes('TAKEFROMVAULT') ||
    effects.includes('ADDTOVAULT')
  )
}
