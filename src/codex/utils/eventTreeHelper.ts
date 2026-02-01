import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy'
import { Selection } from 'd3-selection'

import { Event, EventTreeNode } from '@/codex/types/events'

import { LevelOfDetail } from '../constants/eventSearchValues'

import {
  type NodeMap,
  getNodeDimensions,
  hasEffects,
  hasRequirements,
  hasContinues,
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
  !(showLoopingIndicator && node.ref !== undefined)
