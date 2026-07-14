import { MAX_OVERLAP_RESOLUTION_SWEEPS, MIN_SHIFT_THRESHOLD } from '../config'
import { SpacingContext, TreeNode } from '../context'
import {
  buildChildToAllParentsMap,
  buildParentGroups,
  getAllChildrenForParentGroup,
  groupNodesByParent,
} from '../grouping'
import {
  calculateAverageX,
  calculateGapBetweenNodes,
  shiftSubtreeX,
  sortNodesByX,
} from '../geometry'
import { logMaxSweepsWarning } from '../logging'

/**
 * Overlap-resolution pass: repeatedly, for every depth level,
 *
 *   1. push overlapping siblings (same parent) apart symmetrically,
 *   2. push overlapping cousin groups (different parents) apart by moving the
 *      parents and their subtrees,
 *   3. recenter parents over their children — parents that share children
 *      (via direct links or refChildren) are recentered as a group so their
 *      relative spacing is preserved.
 *
 * Fixing one overlap can create another elsewhere, so the whole sequence
 * sweeps until a full sweep makes no adjustment (capped for safety).
 */
export const resolveOverlaps = (ctx: SpacingContext, nodesByDepth: TreeNode[][]): void => {
  let sweep = 0
  let madeAdjustment = true

  while (madeAdjustment && sweep < MAX_OVERLAP_RESOLUTION_SWEEPS) {
    madeAdjustment = false
    sweep++

    if (sweep === MAX_OVERLAP_RESOLUTION_SWEEPS) {
      logMaxSweepsWarning(
        'overlap resolution',
        MAX_OVERLAP_RESOLUTION_SWEEPS,
        'Tree may still have overlaps.'
      )
    }

    for (let depth = 1; depth < nodesByDepth.length; depth++) {
      if (separateOverlappingSiblings(ctx, nodesByDepth[depth] || [])) {
        madeAdjustment = true
      }
      if (separateOverlappingCousins(ctx, nodesByDepth[depth - 1] || [])) {
        madeAdjustment = true
      }
    }

    if (recenterParentsOverChildren(nodesByDepth)) {
      madeAdjustment = true
    }
  }
}

/**
 * Push apart adjacent siblings (same parent) that are closer than the minimum
 * gap. Both siblings move half the overlap, taking their subtrees with them.
 */
const separateOverlappingSiblings = (ctx: SpacingContext, nodesAtDepth: TreeNode[]): boolean => {
  let madeAdjustment = false
  const nodesByParent = groupNodesByParent(nodesAtDepth)

  nodesByParent.forEach((siblings) => {
    if (siblings.length < 2) return

    const sortedSiblings = sortNodesByX(siblings)

    // Check each adjacent pair
    for (let i = 0; i < sortedSiblings.length - 1; i++) {
      const leftSibling = sortedSiblings[i]
      const rightSibling = sortedSiblings[i + 1]

      const currentGap = calculateGapBetweenNodes(ctx, leftSibling, rightSibling)

      if (currentGap < ctx.minHorizontalGap) {
        madeAdjustment = true
        const overlap = ctx.minHorizontalGap - currentGap
        const halfShift = overlap / 2

        shiftSubtreeX(leftSibling, -halfShift)
        shiftSubtreeX(rightSibling, halfShift)
      }
    }
  })

  return madeAdjustment
}

/**
 * Push apart the children of adjacent parents when the rightmost child of the
 * left parent overlaps the leftmost child of the right parent. The parents on
 * each side move as a block (with their subtrees), so the whole left group
 * shifts left and the whole right group shifts right.
 *
 * Only direct children matter here — refChildren don't take up extra space.
 */
const separateOverlappingCousins = (
  ctx: SpacingContext,
  parentsAtPrevDepth: TreeNode[]
): boolean => {
  let madeAdjustment = false
  const sortedParents = sortNodesByX(parentsAtPrevDepth)

  // Only consider parents that actually have children at this depth.
  // This prevents "blind spots" where a childless parent sits between two
  // parents with children, preventing their children from being checked.
  const parentsWithChildren = sortedParents.filter((parent) => (parent.children || []).length > 0)

  // Check each adjacent pair of parents (that have children)
  for (let i = 0; i < parentsWithChildren.length - 1; i++) {
    const leftParent = parentsWithChildren[i]
    const rightParent = parentsWithChildren[i + 1]

    const leftChildren = leftParent.children || []
    const rightChildren = rightParent.children || []

    if (leftChildren.length === 0 || rightChildren.length === 0) continue

    // The boundary children are the ones that can collide
    const rightmostLeftChild = sortNodesByX(leftChildren)[leftChildren.length - 1]
    const leftmostRightChild = sortNodesByX(rightChildren)[0]
    const currentGap = calculateGapBetweenNodes(ctx, rightmostLeftChild, leftmostRightChild)

    // If overlap exists, move parents apart symmetrically
    if (currentGap < ctx.minHorizontalGap) {
      madeAdjustment = true
      const overlap = ctx.minHorizontalGap - currentGap
      const halfShift = overlap / 2

      const leftParentIndex = sortedParents.indexOf(leftParent)
      const rightParentIndex = sortedParents.indexOf(rightParent)

      // Move left parent group (start to leftParent) LEFT by halfShift
      for (let j = 0; j <= leftParentIndex; j++) {
        shiftSubtreeX(sortedParents[j], -halfShift)
      }

      // Move right parent group (rightParent to end) RIGHT by halfShift
      for (let j = rightParentIndex; j < sortedParents.length; j++) {
        shiftSubtreeX(sortedParents[j], halfShift)
      }
    }
  }

  return madeAdjustment
}

/**
 * Recenter parent groups over their shared children, working from the bottom
 * of the tree upward. Only the parent nodes themselves move — their children
 * are already positioned correctly.
 */
const recenterParentsOverChildren = (nodesByDepth: TreeNode[][]): boolean => {
  let madeAdjustment = false

  for (let depth = nodesByDepth.length - 2; depth >= 0; depth--) {
    const nodesAtDepth = nodesByDepth[depth] || []

    const childToParentsMap = buildChildToAllParentsMap(nodesAtDepth)

    // Group parents that share ANY children
    const parentGroups = buildParentGroups(nodesAtDepth, childToParentsMap)

    parentGroups.forEach((group) => {
      const allChildren = getAllChildrenForParentGroup(group, nodesByDepth[depth + 1])
      if (allChildren.length === 0) return

      // Shift the whole group so its average x sits over the children's average x
      const offset = calculateAverageX(allChildren) - calculateAverageX(group)

      if (Math.abs(offset) > MIN_SHIFT_THRESHOLD) {
        madeAdjustment = true
        group.forEach((parent) => {
          parent.x = (parent.x ?? 0) + offset
        })
      }
    })
  }

  return madeAdjustment
}
