import { HierarchyPointNode } from 'd3-hierarchy'

import { Event, EventTreeNode } from '@/codex/types/events'
import { NODE } from '@/codex/constants/eventTreeValues'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import { getNodeDimensions, getNodeWidth, type NodeMap } from '../eventNodeDimensions'

/**
 * A positioned node in the laid-out event tree.
 */
export type TreeNode = HierarchyPointNode<EventTreeNode>

/**
 * Everything the spacing passes need in order to measure nodes and enforce gaps,
 * bundled once so it doesn't have to be threaded through every helper.
 */
export interface SpacingContext {
  nodeMap: NodeMap
  event: Event
  showLoopingIndicator: boolean
  levelOfDetail: LevelOfDetail
  showContinuesTags: boolean
  /** Minimum allowed horizontal gap between the edges of two nodes */
  minHorizontalGap: number
}

export const createSpacingContext = (
  nodeMap: NodeMap,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): SpacingContext => ({
  nodeMap,
  event,
  showLoopingIndicator,
  levelOfDetail,
  showContinuesTags,
  minHorizontalGap: NODE.HORIZONTAL_SPACING_DEFAULT,
})

/**
 * Width of a node under the current rendering settings (cached upstream).
 */
export const getWidth = (ctx: SpacingContext, node: TreeNode): number =>
  getNodeWidth(
    ctx.nodeMap,
    node.data,
    ctx.event,
    ctx.showLoopingIndicator,
    ctx.levelOfDetail,
    ctx.showContinuesTags
  )

/**
 * Height of a node under the current rendering settings (cached upstream).
 */
export const getHeight = (ctx: SpacingContext, node: TreeNode): number => {
  const [, height] = getNodeDimensions(
    ctx.nodeMap,
    node.data,
    ctx.event,
    ctx.showLoopingIndicator,
    ctx.levelOfDetail,
    ctx.showContinuesTags
  )
  return height
}
