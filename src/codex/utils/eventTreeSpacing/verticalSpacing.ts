import { NODE } from '@/codex/constants/eventTreeValues'

import { HORIZONTAL_SPREAD_PX_PER_VERTICAL_INCREMENT } from './config'
import { SpacingContext, TreeNode, getHeight } from './context'
import { buildRefChildrenParentMap, groupNodesByDepth, groupNodesByParent } from './grouping'
import { shiftSubtreeY } from './geometry'

/**
 * Adjust vertical spacing to maintain consistent gaps between parent and child
 * nodes while keeping siblings at the same depth aligned horizontally.
 *
 * Processes the tree level by level: finds the minimum edge-to-edge gap between
 * any parent (direct or refChildren link) and its child at that depth, and if
 * it's below the desired gap, shifts the entire level (and everything below it)
 * down by the difference.
 */
export const applyVerticalSpacing = (ctx: SpacingContext, root: TreeNode): void => {
  const nodesByDepth = groupNodesByDepth(root)

  // Process each depth level (skip root at depth 0)
  for (let depth = 1; depth < nodesByDepth.length; depth++) {
    const nodesAtDepth = nodesByDepth[depth]
    const nodesAtPrevDepth = nodesByDepth[depth - 1] || []

    const desiredGap = calculateDesiredGap(ctx, nodesAtDepth, nodesAtPrevDepth)

    // Parents at the previous depth that link to nodes here via refChildren
    const refChildrenParentMap = buildRefChildrenParentMap(nodesAtPrevDepth)

    // Find the minimum gap among all nodes at this depth,
    // checking BOTH direct parent links AND refChildren links
    let minGap = Infinity
    nodesAtDepth.forEach((node) => {
      if (node.parent) {
        minGap = Math.min(minGap, verticalGapBetween(ctx, node.parent, node))
      }

      const refParents = refChildrenParentMap.get(node.data.id)
      refParents?.forEach((refParent) => {
        minGap = Math.min(minGap, verticalGapBetween(ctx, refParent, node))
      })
    })

    // If the minimum gap is less than desired, shift all nodes at this depth (and deeper)
    if (minGap < desiredGap) {
      const offset = desiredGap - minGap
      nodesAtDepth.forEach((node) => {
        shiftSubtreeY(node, offset)
      })
    }
  }
}

/**
 * Vertical gap between the bottom edge of a parent and the top edge of a child
 */
const verticalGapBetween = (ctx: SpacingContext, parent: TreeNode, child: TreeNode): number =>
  child.y - parent.y - (getHeight(ctx, parent) / 2 + getHeight(ctx, child) / 2)

/**
 * The gap this depth level should have below its parents:
 * - chains of single children (with no refChildren links into this level) pack
 *   tighter with the short gap,
 * - wide levels get extra gap proportional to their widest sibling group's
 *   horizontal spread, so links to far-out children don't run nearly horizontal.
 */
const calculateDesiredGap = (
  ctx: SpacingContext,
  nodesAtDepth: TreeNode[],
  nodesAtPrevDepth: TreeNode[]
): number => {
  // Widest horizontal spread among the sibling groups at this depth
  let maxHorizontalDistance = 0
  groupNodesByParent(nodesAtDepth).forEach((children) => {
    if (children.length > 1) {
      const xPositions = children.map((child) => child.x ?? 0)
      const horizontalDistance = Math.max(...xPositions) - Math.min(...xPositions)
      maxHorizontalDistance = Math.max(maxHorizontalDistance, horizontalDistance)
    }
  })

  const allNodesAreSingleChildren = nodesAtDepth.every(
    (node) => node.parent?.children?.length === 1
  )
  const anyParentHasRefChildren = nodesAtPrevDepth.some(
    ({ data }) => data.refChildren && data.refChildren.length > 0
  )

  const baseGap =
    allNodesAreSingleChildren && !anyParentHasRefChildren
      ? NODE.VERTICAL_SPACING_SHORT_BY_LEVEL_OF_DETAIL[ctx.levelOfDetail]
      : NODE.VERTICAL_SPACING_DEFAULT

  const horizontalSpreadFactor = Math.floor(
    maxHorizontalDistance / HORIZONTAL_SPREAD_PX_PER_VERTICAL_INCREMENT
  )

  return baseGap + horizontalSpreadFactor * NODE.VERTICAL_SPACING_INCREMENT
}
