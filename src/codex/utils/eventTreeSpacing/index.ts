import { HierarchyPointNode } from 'd3-hierarchy'

import { Event, EventTreeNode } from '@/codex/types/events'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import { type NodeMap } from '../eventNodeDimensions'

import { createSpacingContext } from './context'
import { groupNodesByDepth } from './grouping'
import { centerChildrenUnderParents } from './passes/centerChildrenUnderParents'
import { centerMultiParentChildren } from './passes/centerMultiParentChildren'
import { resolveOverlaps } from './passes/resolveOverlaps'
import { tightenGaps } from './passes/tightenGaps'
import { applyVerticalSpacing } from './verticalSpacing'

export { centerRootNodeHorizontally } from './rootCentering'

/**
 * Adjust horizontal spacing to prevent node overlaps when nodes have different
 * widths. Runs the passes described in README.md, in order:
 *
 * 1. centerChildrenUnderParents — position children centered under each parent
 *    (ignoring overlaps)
 * 2. centerMultiParentChildren — center children with multiple parents
 *    (direct + refChildren) under the average of all their parents
 * 3. resolveOverlaps — push apart overlapping siblings/cousins and recenter
 *    parent groups over shared children
 * 4. tightenGaps — remove excess spacing between sibling subtrees, middle-out
 * 5. centerMultiParentChildren again — tightening can drag shared nodes
 *    off-center
 *
 * NOTE: Events with nodes that are both direct children of one parent AND
 * refChildren of multiple other parents can cause iterative drift in the
 * overlap-resolution and gap-tightening passes. The horizontal spacing logic
 * doesn't properly handle the case where a node's position is controlled by
 * one parent but it's also referenced by others. Such events should be
 * blacklisted from refChildren creation in parse-event-trees.js
 * (see REF_CHILDREN_BLACKLIST).
 */
export const adjustHorizontalNodeSpacing = (
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
  const nodesByDepth = groupNodesByDepth(root)

  centerChildrenUnderParents(ctx, nodesByDepth)
  centerMultiParentChildren(ctx, nodesByDepth)
  resolveOverlaps(ctx, nodesByDepth)
  tightenGaps(ctx, nodesByDepth)
  centerMultiParentChildren(ctx, nodesByDepth)
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
