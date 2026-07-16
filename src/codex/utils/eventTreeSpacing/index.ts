import { HierarchyNode, HierarchyPointNode } from 'd3-hierarchy'
import { flextree } from 'd3-flextree'

import { Event, EventTreeNode } from '@/codex/types/events'
import { NODE } from '@/codex/constants/eventTreeValues'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import { type NodeMap } from '../eventNodeDimensions'

import { createSpacingContext, getWidth, type TreeNode } from './context'
import { groupNodesByDepth } from './grouping'
import { centerMultiParentChildren } from './passes/centerMultiParentChildren'
import { centerParentsOverSharedChildren } from './passes/centerParentsOverSharedChildren'
import { applyVerticalSpacing } from './verticalSpacing'

export { centerRootNodeHorizontally } from './rootCentering'

/**
 * Compute horizontal node positions (and initial vertical row positions) for
 * the event tree. Two steps, described in README.md:
 *
 * 1. flextree — a Reingold–Tilford tidy layout that supports variable node
 *    widths: subtrees are packed bottom-up against each other's contours, so
 *    sibling/cousin overlaps are impossible by construction and parents end up
 *    centered over their children. Each node's slot is its width plus the
 *    minimum gap, giving adjacent nodes at least minHorizontalGap of air.
 * 2. centerMultiParentChildren — flextree only knows the direct-child tree;
 *    sibling groups that are also refChildren of other parents are recentered
 *    (moving as one group) under the average of ALL their parents, clamped so
 *    no overlap can be introduced.
 * 3. centerParentsOverSharedChildren — when step 2 was clamped (the children's
 *    subtrees have no room to slide), the parents move over the children
 *    instead, closing the remaining offset from the other side.
 *
 * The constant vertical slot size keeps every row at y = depth *
 * VERTICAL_SPACING_DEFAULT; adjustVerticalNodeSpacing then spreads rows apart
 * where node heights demand it.
 */
export const adjustHorizontalNodeSpacing = (
  nodeMap: NodeMap,
  root: HierarchyNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): void => {
  const ctx = createSpacingContext(
    nodeMap,
    event,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
  )

  const layout = flextree<EventTreeNode>({
    nodeSize: (node) => [
      getWidth(ctx, node as TreeNode) + ctx.minHorizontalGap,
      NODE.VERTICAL_SPACING_DEFAULT,
    ],
  })
  layout(root)

  const pointRoot = root as HierarchyPointNode<EventTreeNode>
  const nodesByDepth = groupNodesByDepth(pointRoot)
  centerMultiParentChildren(ctx, nodesByDepth)
  centerParentsOverSharedChildren(ctx, nodesByDepth)
}

/**
 * Adjust vertical spacing to maintain consistent gaps between parent and child
 * nodes while keeping siblings at the same depth aligned horizontally.
 * See verticalSpacing.ts for details.
 */
export const adjustVerticalNodeSpacing = (
  nodeMap: NodeMap,
  root: HierarchyPointNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): void => {
  const ctx = createSpacingContext(
    nodeMap,
    event,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
  )

  applyVerticalSpacing(ctx, root)
}
