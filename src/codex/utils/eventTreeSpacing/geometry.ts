import { SpacingContext, TreeNode, getWidth } from './context'

export type ShiftDirection = 'left' | 'right'

/**
 * Calculate the left edge x-coordinate of a node
 */
export const getNodeLeftEdgeX = (ctx: SpacingContext, node: TreeNode): number =>
  (node.x ?? 0) - getWidth(ctx, node) / 2

/**
 * Calculate the right edge x-coordinate of a node
 */
export const getNodeRightEdgeX = (ctx: SpacingContext, node: TreeNode): number =>
  (node.x ?? 0) + getWidth(ctx, node) / 2

/**
 * Sort nodes by their x position (left to right). Returns a new array.
 */
export const sortNodesByX = (nodes: TreeNode[]): TreeNode[] =>
  [...nodes].sort((a, b) => (a.x ?? 0) - (b.x ?? 0))

/**
 * Calculate the average x position of a set of nodes
 */
export const calculateAverageX = (nodes: TreeNode[]): number =>
  nodes.reduce((sum, n) => sum + (n.x ?? 0), 0) / nodes.length

/**
 * Calculate the horizontal gap between two adjacent nodes: the distance from
 * the right edge of the left node to the left edge of the right node.
 * Negative when the nodes overlap.
 */
export const calculateGapBetweenNodes = (
  ctx: SpacingContext,
  leftNode: TreeNode,
  rightNode: TreeNode
): number => getNodeLeftEdgeX(ctx, rightNode) - getNodeRightEdgeX(ctx, leftNode)

/**
 * Shift a node and its entire subtree horizontally by the given offset
 */
export const shiftSubtreeX = (node: TreeNode, offset: number): void => {
  node.x = (node.x ?? 0) + offset
  node.children?.forEach((child) => shiftSubtreeX(child, offset))
}

/**
 * Shift a node and its entire subtree vertically by the given offset
 */
export const shiftSubtreeY = (node: TreeNode, offset: number): void => {
  node.y += offset
  node.children?.forEach((child) => shiftSubtreeY(child, offset))
}

/**
 * Calculate how far a node's subtree can safely shift in the given direction
 * before any of its descendants would come within minHorizontalGap of a node
 * outside the subtree.
 *
 * For each depth level below `depth`, finds the subtree's boundary node
 * (rightmost or leftmost, depending on direction) and measures the free space
 * to the closest obstacle among ALL nodes in the tree at that depth. The
 * tightest level wins. Returns at most `initialMaxShift`, and 0 if any level
 * is already overlapping.
 */
export const calculateMaxShiftForNode = (
  ctx: SpacingContext,
  node: TreeNode,
  initialMaxShift: number,
  direction: ShiftDirection,
  depth: number,
  nodesByDepth: TreeNode[][]
): number => {
  let maxShift = initialMaxShift

  // Group the subtree's nodes by absolute depth to find its boundary at each level
  const descendantsByDepth: TreeNode[][] = []
  node.descendants().forEach((descendant) => {
    if (!descendantsByDepth[descendant.depth]) {
      descendantsByDepth[descendant.depth] = []
    }
    descendantsByDepth[descendant.depth].push(descendant)
  })

  for (let checkDepth = depth + 1; checkDepth < descendantsByDepth.length; checkDepth++) {
    const subtreeNodesAtDepth = descendantsByDepth[checkDepth]
    if (!subtreeNodesAtDepth || subtreeNodesAtDepth.length === 0) continue

    const sortedNodes = sortNodesByX(subtreeNodesAtDepth)
    const boundaryNode =
      direction === 'right' ? sortedNodes[sortedNodes.length - 1] : sortedNodes[0]
    const boundaryEdge =
      direction === 'right'
        ? getNodeRightEdgeX(ctx, boundaryNode)
        : getNodeLeftEdgeX(ctx, boundaryNode)

    const closestObstacleEdge = findClosestObstacleEdge(
      ctx,
      boundaryEdge,
      direction,
      nodesByDepth[checkDepth] || []
    )

    if (closestObstacleEdge !== null) {
      const gap =
        direction === 'right'
          ? closestObstacleEdge - boundaryEdge - ctx.minHorizontalGap
          : boundaryEdge - closestObstacleEdge - ctx.minHorizontalGap

      if (gap < 0) {
        // Would cause overlap, can't shift at all
        return 0
      }
      // Reduce maxShift if this depth has a tighter constraint
      maxShift = Math.min(maxShift, gap)
    }
  }

  return maxShift
}

/**
 * Find the facing edge of the closest node strictly beyond `x` in the shift
 * direction (left edge of nodes to the right, right edge of nodes to the
 * left), or null if there is no node in that direction.
 */
const findClosestObstacleEdge = (
  ctx: SpacingContext,
  x: number,
  direction: ShiftDirection,
  nodesAtDepth: TreeNode[]
): number | null => {
  let closestEdge: number | null = null
  let minDistance = Infinity

  nodesAtDepth.forEach((node) => {
    const edge = direction === 'right' ? getNodeLeftEdgeX(ctx, node) : getNodeRightEdgeX(ctx, node)
    const distance = direction === 'right' ? edge - x : x - edge

    if (distance > 0 && distance < minDistance) {
      minDistance = distance
      closestEdge = edge
    }
  })

  return closestEdge
}
