import { MULTI_PARENT_CENTERING_THRESHOLD_RATIO } from '../config'
import { SpacingContext, TreeNode } from '../context'
import { buildChildToAllParentsMap } from '../grouping'
import { calculateAverageX, calculateMaxShiftForNode, shiftSubtreeX } from '../geometry'

/**
 * Multi-parent centering pass: a node that is a direct child of one parent but
 * also a refChild of others should sit centered under the average x of ALL its
 * parents, not just the direct one.
 *
 * Each shift is clamped via calculateMaxShiftForNode so recentering a shared
 * subtree never introduces new overlaps. This pass runs once after the initial
 * positioning, and once more at the very end — gap tightening can drag a
 * shared child away from its desired average-of-parents position.
 */
export const centerMultiParentChildren = (
  ctx: SpacingContext,
  nodesByDepth: TreeNode[][]
): void => {
  // Offsets below this aren't worth recentering a shared child for
  const minShift = ctx.minHorizontalGap * MULTI_PARENT_CENTERING_THRESHOLD_RATIO

  for (let depth = 1; depth < nodesByDepth.length; depth++) {
    const nodesAtDepth = nodesByDepth[depth] || []
    const parentsAtPrevDepth = nodesByDepth[depth - 1] || []

    const childToAllParentsMap = buildChildToAllParentsMap(parentsAtPrevDepth)

    nodesAtDepth.forEach((child) => {
      const allParents = childToAllParentsMap.get(child.data.id)

      // Only children with multiple parents (direct + ref) need recentering
      if (!allParents || allParents.length < 2) return

      const desiredOffset = calculateAverageX(allParents) - (child.x ?? 0)
      if (Math.abs(desiredOffset) <= minShift) return

      // Clamp the shift so we don't introduce overlaps when pulling a shared subtree
      const direction = desiredOffset < 0 ? 'left' : 'right'
      const maxSafeShift = calculateMaxShiftForNode(
        ctx,
        child,
        Math.abs(desiredOffset),
        direction,
        Math.max(0, child.depth - 1),
        nodesByDepth
      )

      if (maxSafeShift > minShift) {
        shiftSubtreeX(child, direction === 'left' ? -maxSafeShift : maxSafeShift)
      }
    })
  }
}
