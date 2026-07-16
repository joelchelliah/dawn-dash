import { MULTI_PARENT_CENTERING_THRESHOLD_RATIO } from '../config'
import { SpacingContext, TreeNode } from '../context'
import { buildChildToAllParentsMap, groupSiblingsByParentSet } from '../grouping'
import { calculateAverageX, calculateMaxShiftForNode, shiftSubtreeX } from '../geometry'

/**
 * Multi-parent centering pass: nodes that are direct children of one parent but
 * also refChildren of others should sit centered under the average x of ALL
 * their parents, not just the direct one. flextree can't know about refChildren
 * (it lays out the direct-child tree only), so this runs once after it.
 *
 * Siblings sharing the same parent set move together as one group: individually
 * they would block each other (adjacent siblings already sit at the minimum
 * gap), so the group's own nodes are excluded from the obstacle check and only
 * nodes outside the moving group clamp the shift. This is also what keeps a
 * whole row of shared children centered under the midpoint of its parents
 * instead of stuck under the direct parent.
 *
 * Each group shift is clamped via calculateMaxShiftForNode so recentering can
 * never introduce overlaps.
 */
export const centerMultiParentChildren = (
  ctx: SpacingContext,
  nodesByDepth: TreeNode[][]
): void => {
  // Offsets below this aren't worth recentering shared children for
  const minShift = ctx.minHorizontalGap * MULTI_PARENT_CENTERING_THRESHOLD_RATIO

  for (let depth = 1; depth < nodesByDepth.length; depth++) {
    const nodesAtDepth = nodesByDepth[depth] || []
    const parentsAtPrevDepth = nodesByDepth[depth - 1] || []

    const childToAllParentsMap = buildChildToAllParentsMap(parentsAtPrevDepth)
    const siblingsByParentSet = groupSiblingsByParentSet(nodesAtDepth, childToAllParentsMap)

    siblingsByParentSet.forEach((siblings) => {
      const allParents = childToAllParentsMap.get(siblings[0].data.id)

      // Only children with multiple parents (direct + ref) need recentering
      if (!allParents || allParents.length < 2) return

      const desiredOffset = calculateAverageX(allParents) - calculateAverageX(siblings)
      if (Math.abs(desiredOffset) <= minShift) return

      // The whole group moves as a unit, so its own subtrees can't collide with
      // each other — only nodes outside the group act as obstacles.
      const movingNodes = new Set(siblings.flatMap((sibling) => sibling.descendants()))

      const direction = desiredOffset < 0 ? 'left' : 'right'
      const maxSafeShift = siblings.reduce(
        (maxShift, sibling) =>
          Math.min(
            maxShift,
            calculateMaxShiftForNode(
              ctx,
              sibling,
              Math.abs(desiredOffset),
              direction,
              Math.max(0, sibling.depth - 1),
              nodesByDepth,
              movingNodes
            )
          ),
        Math.abs(desiredOffset)
      )

      if (maxSafeShift > minShift) {
        const offset = direction === 'left' ? -maxSafeShift : maxSafeShift
        siblings.forEach((sibling) => shiftSubtreeX(sibling, offset))
      }
    })
  }
}
