import { MAX_GAP_TIGHTENING_SWEEPS, MIN_SHIFT_THRESHOLD } from '../config'
import { SpacingContext, TreeNode } from '../context'
import { groupNodesByParent } from '../grouping'
import {
  calculateGapBetweenNodes,
  calculateMaxShiftForNode,
  shiftSubtreeX,
  sortNodesByX,
} from '../geometry'
import { logMaxSweepsWarning } from '../logging'

/**
 * Gap-tightening pass: removes unnecessary spacing between sibling subtrees
 * that was created by the overlap-resolution pass's ancestor recentering.
 *
 * Siblings are processed middle-out (for [A,B,C,D,E,F]: C→B→A, then D→E→F) so
 * the tree stays balanced while becoming as compact as possible. Each sibling
 * shifts toward the center by as much as its entire subtree allows —
 * calculateMaxShiftForNode checks the subtree's boundary at every depth
 * against ALL nodes in the tree at that depth, so no shift can cause overlap.
 *
 * Sweeps until stable (capped): tightening at deeper levels can create
 * opportunities at shallower levels, which needs to propagate upward.
 */
export const tightenGaps = (ctx: SpacingContext, nodesByDepth: TreeNode[][]): void => {
  let sweep = 0
  let madeAdjustment = true

  while (madeAdjustment && sweep < MAX_GAP_TIGHTENING_SWEEPS) {
    madeAdjustment = false
    sweep++

    if (sweep === MAX_GAP_TIGHTENING_SWEEPS) {
      logMaxSweepsWarning(
        'gap tightening',
        MAX_GAP_TIGHTENING_SWEEPS,
        'Tree may not be fully tightened.'
      )
    }

    for (let depth = 0; depth < nodesByDepth.length; depth++) {
      const nodesByParent = groupNodesByParent(nodesByDepth[depth] || [])

      nodesByParent.forEach((siblings) => {
        if (siblings.length < 2) return

        if (tightenSiblingGroup(ctx, siblings, depth, nodesByDepth)) {
          madeAdjustment = true
        }
      })
    }
  }
}

/**
 * Tighten one group of siblings middle-out. Returns whether anything moved.
 *
 * The middle nodes get special treatment to keep the group symmetric:
 * - Even count [A,B,C,D]: B shifts right by only half its available room, then
 *   C shifts left by its FULL room (which already shrank when B moved).
 * - Odd count [A,B,C,D,E]: the center node C never moves; B and D shift
 *   toward it by their full room.
 */
const tightenSiblingGroup = (
  ctx: SpacingContext,
  siblings: TreeNode[],
  depth: number,
  nodesByDepth: TreeNode[][]
): boolean => {
  let madeAdjustment = false
  const sortedSiblings = sortNodesByX(siblings)
  const middleIndex = Math.floor(sortedSiblings.length / 2)
  const isEvenCount = sortedSiblings.length % 2 === 0

  // Left side: from middle-1 going down to 0, each node shifts RIGHT (toward center)
  for (let i = middleIndex - 1; i >= 0; i--) {
    const node = sortedSiblings[i]
    const rightSibling = sortedSiblings[i + 1]
    const isMiddleLeft = i === middleIndex - 1

    // Slack between this node and its right sibling, beyond the minimum gap
    const initialGap = calculateGapBetweenNodes(ctx, node, rightSibling) - ctx.minHorizontalGap
    if (initialGap <= 0) continue // Already at minimum gap, no tightening possible

    // Check all descendants to find the maximum safe shift amount
    const maxShift = calculateMaxShiftForNode(ctx, node, initialGap, 'right', depth, nodesByDepth)

    if (maxShift > MIN_SHIFT_THRESHOLD) {
      madeAdjustment = true
      const shiftAmount = isMiddleLeft && isEvenCount ? maxShift / 2 : maxShift
      shiftSubtreeX(node, shiftAmount)
    }
  }

  // Right side: from middle going up to the end, each node shifts LEFT (toward center)
  for (let i = middleIndex; i < sortedSiblings.length; i++) {
    const node = sortedSiblings[i]
    const leftSibling = i > 0 ? sortedSiblings[i - 1] : null
    const isMiddleRight = i === middleIndex

    if (!leftSibling) continue

    // Slack between this node and its left sibling, beyond the minimum gap
    const initialGap = calculateGapBetweenNodes(ctx, leftSibling, node) - ctx.minHorizontalGap
    if (initialGap <= 0) continue // Already at minimum gap, no tightening possible

    // Check all descendants to find the maximum safe shift amount
    const maxShift = calculateMaxShiftForNode(ctx, node, initialGap, 'left', depth, nodesByDepth)

    if (maxShift > MIN_SHIFT_THRESHOLD) {
      // For odd-count siblings, the center node never shifts
      if (isMiddleRight && !isEvenCount) {
        continue
      }

      madeAdjustment = true
      shiftSubtreeX(node, -maxShift)
    }
  }

  return madeAdjustment
}
