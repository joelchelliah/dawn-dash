import { MULTI_PARENT_CENTERING_THRESHOLD_RATIO } from '../config'
import { SpacingContext, TreeNode } from '../context'
import {
  buildChildToAllParentsMap,
  buildParentGroups,
  getAllChildrenForParentGroup,
} from '../grouping'
import { calculateAverageX, calculateMaxShiftForRowNodes } from '../geometry'

/**
 * Parent-side complement to centerMultiParentChildren: when a shared sibling
 * group can't slide under its parents' average (its subtrees are packed at the
 * minimum gap against neighbors), move the PARENTS over the children instead.
 *
 * Parents sharing any children (direct + refChildren) move as one group,
 * preserving their relative spacing, so that the group's average x lands over
 * the average x of all their children. Only the parent nodes themselves move —
 * their subtrees (which include the already-positioned shared children) stay
 * put — so the clamp only needs to consider the parents' own row.
 *
 * Runs bottom-up so recentering deep parents settles before shallower groups
 * measure their children.
 */
export const centerParentsOverSharedChildren = (
  ctx: SpacingContext,
  nodesByDepth: TreeNode[][]
): void => {
  // Offsets below this aren't worth moving a parent group for
  const minShift = ctx.minHorizontalGap * MULTI_PARENT_CENTERING_THRESHOLD_RATIO

  for (let depth = nodesByDepth.length - 2; depth >= 0; depth--) {
    const parentsAtDepth = nodesByDepth[depth] || []

    const childToAllParentsMap = buildChildToAllParentsMap(parentsAtDepth)
    const parentGroups = buildParentGroups(parentsAtDepth, childToAllParentsMap)

    parentGroups.forEach((group) => {
      if (group.length < 2) return

      const allChildren = getAllChildrenForParentGroup(group, nodesByDepth[depth + 1])
      if (allChildren.length === 0) return

      const desiredOffset = calculateAverageX(allChildren) - calculateAverageX(group)
      if (Math.abs(desiredOffset) <= minShift) return

      const direction = desiredOffset < 0 ? 'left' : 'right'
      const maxSafeShift = calculateMaxShiftForRowNodes(
        ctx,
        group,
        Math.abs(desiredOffset),
        direction,
        parentsAtDepth
      )

      if (maxSafeShift > minShift) {
        const offset = direction === 'left' ? -maxSafeShift : maxSafeShift
        group.forEach((parent) => {
          parent.x = (parent.x ?? 0) + offset
        })
      }
    })
  }
}
