import { HierarchyPointNode } from 'd3-hierarchy'

import { Event, EventTreeNode } from '@/codex/types/events'
import { NODE } from '@/codex/constants/eventTreeValues'

import { getNodeHeight, getNodeWidth } from './eventTreeHelper'

const HORIZONTAL_SPACING_PASS_2_MAX_ITERATIONS = 10
const HORIZONTAL_SPACING_MIN_SHIFT_THRESHOLD = 1
const HORIZONTAL_SPACING_CONFIG = {
  pass1Enabled: true,
  pass2Enabled: true,
  pass3Enabled: true,
}

/**
 * Adjust horizontal spacing to prevent node overlaps when nodes have different widths.
 *
 * - Pass 1: Position children centered under each parent (ignoring overlaps)
 * - Pass 2: Fix overlaps by moving parent subtrees apart and recentering ancestors
 * - Pass 3: Tighten gaps by looking for large gaps between sibling subtrees and moving them closer
 */
export const adjustHorizontalNodeSpacing = (
  root: HierarchyPointNode<EventTreeNode>,
  event: Event
) => {
  const minHorizontalGap = NODE.HORIZONTAL_SPACING_DEFAULT
  const nodesByDepth = groupNodesByDepth(root)

  // PASS 1: Position children, centered, under parents (ignore overlaps)
  if (HORIZONTAL_SPACING_CONFIG.pass1Enabled) {
    for (let depth = 0; depth < nodesByDepth.length; depth++) {
      const parentsAtDepth = nodesByDepth[depth] || []

      parentsAtDepth.forEach((parent) => {
        if (!parent.children || parent.children.length === 0) return

        // Calculate total width needed for all children with gaps
        let totalWidth = 0
        const childWidths = parent.children.map((child) => getNodeWidth(child.data, event))

        childWidths.forEach((width, i) => {
          totalWidth += width
          if (i < childWidths.length - 1) {
            totalWidth += minHorizontalGap
          }
        })

        // Position children centered under parent
        const parentX = parent.x ?? 0
        let currentX = parentX - totalWidth / 2

        parent.children.forEach((child, i) => {
          const childWidth = childWidths[i]
          child.x = currentX + childWidth / 2
          currentX += childWidth + minHorizontalGap
        })
      })
    }
  }

  // PASS 2: Iteratively fix overlaps and recenter ancestors
  // Run multiple iterations until no adjustments are made
  if (HORIZONTAL_SPACING_CONFIG.pass2Enabled) {
    let iteration = 0
    let madeAdjustment = true

    while (madeAdjustment && iteration < HORIZONTAL_SPACING_PASS_2_MAX_ITERATIONS) {
      madeAdjustment = false
      iteration++

      // eslint-disable-next-line no-console
      if (iteration === HORIZONTAL_SPACING_PASS_2_MAX_ITERATIONS) {
        console.error(
          `adjustHorizontalNodeSpacing: Reached maximum iterations (${HORIZONTAL_SPACING_PASS_2_MAX_ITERATIONS}). Tree may still have overlaps.`
        )
      }

      // Fix overlaps at each depth
      for (let depth = 1; depth < nodesByDepth.length; depth++) {
        // 1 -- Check for overlaps between siblings at the current depth
        const nodesAtDepth = nodesByDepth[depth] || []
        const nodesByParent = groupNodesByParent(nodesAtDepth)

        // Check each group of siblings
        nodesByParent.forEach((siblings) => {
          if (siblings.length < 2) return

          const sortedSiblings = sortNodesByX(siblings)

          // Check each adjacent pair
          for (let i = 0; i < sortedSiblings.length - 1; i++) {
            const leftSibling = sortedSiblings[i]
            const rightSibling = sortedSiblings[i + 1]

            const currentGap = calculateGapBetweenNodes(leftSibling, rightSibling, event)

            if (currentGap < minHorizontalGap) {
              madeAdjustment = true
              const overlap = minHorizontalGap - currentGap
              const halfShift = overlap / 2

              // Move left sibling and its subtree LEFT
              leftSibling.x = (leftSibling.x ?? 0) - halfShift
              shiftSubtreeHorizontally(leftSibling, -halfShift)

              // Move right sibling and its subtree RIGHT
              rightSibling.x = (rightSibling.x ?? 0) + halfShift
              shiftSubtreeHorizontally(rightSibling, halfShift)
            }
          }
        })

        // 2 -- Check for overlaps between cousins (different parents)
        const parentsAtPrevDepth = nodesByDepth[depth - 1] || []
        const sortedParents = sortNodesByX(parentsAtPrevDepth)

        // Filter to only parents that have children at this depth
        // This prevents "blind spots" where a parent with no children at this depth
        // sits between two parents that do have children, preventing their children from being checked
        const parentsWithChildrenAtDepth = sortedParents.filter((parent) => {
          const children = parent.children || []
          return children.length > 0
        })

        // Check each adjacent pair of parents (that have children)
        for (let i = 0; i < parentsWithChildrenAtDepth.length - 1; i++) {
          const leftParent = parentsWithChildrenAtDepth[i]
          const rightParent = parentsWithChildrenAtDepth[i + 1]

          // Get the rightmost child of left parent and leftmost child of right parent
          const leftChildren = leftParent.children || []
          const rightChildren = rightParent.children || []

          // Sort children by x to find the boundary children
          const leftChildrenSorted = sortNodesByX(leftChildren)
          const rightChildrenSorted = sortNodesByX(rightChildren)

          const rightmostLeftChild = leftChildrenSorted[leftChildrenSorted.length - 1]
          const leftmostRightChild = rightChildrenSorted[0]
          const currentGap = calculateGapBetweenNodes(rightmostLeftChild, leftmostRightChild, event)

          // If overlap exists, move parents apart symmetrically
          if (currentGap < minHorizontalGap) {
            madeAdjustment = true
            const overlap = minHorizontalGap - currentGap
            const halfShift = overlap / 2

            // Find indices of these parents in the original sortedParents array
            const leftParentIndex = sortedParents.indexOf(leftParent)
            const rightParentIndex = sortedParents.indexOf(rightParent)

            // Move left parent group (0 to leftParentIndex) LEFT by halfShift
            for (let j = 0; j <= leftParentIndex; j++) {
              sortedParents[j].x = (sortedParents[j].x ?? 0) - halfShift
              shiftSubtreeHorizontally(sortedParents[j], -halfShift)
            }

            // Move right parent group (rightParentIndex to end) RIGHT by halfShift
            for (let j = rightParentIndex; j < sortedParents.length; j++) {
              sortedParents[j].x = (sortedParents[j].x ?? 0) + halfShift
              shiftSubtreeHorizontally(sortedParents[j], halfShift)
            }
          }
        }
      }

      // 3 -- Recenter all ancestors over their children
      // Work from bottom to top (deepest to shallowest)
      for (let depth = nodesByDepth.length - 2; depth >= 0; depth--) {
        const nodesAtDepth = nodesByDepth[depth] || []

        nodesAtDepth.forEach((node) => {
          if (!node.children || node.children.length === 0) return

          // Calculate the average x position of children
          const childrenXSum = node.children.reduce((sum, child) => sum + (child.x ?? 0), 0)
          const averageX = childrenXSum / node.children.length

          // Only update if significantly different
          if (Math.abs(averageX - (node.x ?? 0)) > HORIZONTAL_SPACING_MIN_SHIFT_THRESHOLD) {
            node.x = averageX
            madeAdjustment = true

            // Don't shift subtree here - children are already positioned correctly
            // Only the parent node itself moves to recenter
          }
        })
      }
    }
  }

  // PASS 3: Tighten gaps by processing siblings middle-out, checking against entire tree
  // This pass removes unnecessary spacing between sibling subtrees that was created by
  // Pass 2's ancestor recentering. It works by:
  // 1. Processing siblings from the middle outward (e.g., C→B→A then D→E→F for [A,B,C,D,E,F])
  // 2. For each sibling, checking how much it can shift inward without causing overlaps
  // 3. For each subtree being shifted, checking ALL descendants at every depth level to find
  //    the actual boundary (rightmost/leftmost node), not just following a single path
  // 4. Checking the boundary at each depth against ALL nodes in the tree at that depth
  // 5. Using middle-out processing to maintain tree balance while maximizing compactness
  if (HORIZONTAL_SPACING_CONFIG.pass3Enabled) {
    for (let depth = 0; depth < nodesByDepth.length; depth++) {
      const nodesAtDepth = nodesByDepth[depth] || []
      const nodesByParent = groupNodesByParent(nodesAtDepth)

      // Process each group of siblings from the middle outward
      // For [A, B, C, D, E, F], we process: C, B, A (left side), then D, E, F (right side)
      nodesByParent.forEach((siblings) => {
        if (siblings.length < 2) return

        const sortedSiblings = sortNodesByX(siblings)
        const middleIndex = Math.floor(sortedSiblings.length / 2)

        // Process left side: from middle-1 going down to 0
        // These nodes shift RIGHT (toward center)
        for (let i = middleIndex - 1; i >= 0; i--) {
          const node = sortedSiblings[i]
          const rightSibling = sortedSiblings[i + 1]
          const isMiddleLeft = i === middleIndex - 1

          // Calculate initial gap between this node and its right sibling
          const initialGap = calculateGapBetweenNodes(node, rightSibling, event) - minHorizontalGap

          if (initialGap <= 0) continue // Already at minimum gap, no tightening possible

          // Check all descendants to find maximum safe shift amount
          const maxShift = calculateMaxShiftForNode(
            node,
            initialGap,
            'right',
            depth,
            nodesByDepth,
            event,
            minHorizontalGap
          )

          // Shift right by maxShift (or maxShift/2 for even-count middle-left node)
          // Even-count [A,B,C,D]: B shifts by maxShift/2 to move symmetrically toward center
          // Odd-count [A,B,C,D,E]: B shifts by full maxShift (center C will not shift)
          if (maxShift > HORIZONTAL_SPACING_MIN_SHIFT_THRESHOLD) {
            const isEvenCount = sortedSiblings.length % 2 === 0
            const shiftAmount = isMiddleLeft && isEvenCount ? maxShift / 2 : maxShift
            node.x = (node.x ?? 0) + shiftAmount
            shiftSubtreeHorizontally(node, shiftAmount)
          }
        }

        // Process right side: from middle going up to end
        // These nodes shift LEFT (toward center)
        for (let i = middleIndex; i < sortedSiblings.length; i++) {
          const node = sortedSiblings[i]
          const leftSibling = i > 0 ? sortedSiblings[i - 1] : null
          const isMiddleRight = i === middleIndex
          const isEvenCount = sortedSiblings.length % 2 === 0

          if (!leftSibling) continue

          // Calculate initial gap between this node and its left sibling
          const initialGap = calculateGapBetweenNodes(leftSibling, node, event) - minHorizontalGap

          if (initialGap <= 0) continue // Already at minimum gap, no tightening possible

          // Check all descendants to find maximum safe shift amount
          const maxShift = calculateMaxShiftForNode(
            node,
            initialGap,
            'left',
            depth,
            nodesByDepth,
            event,
            minHorizontalGap
          )

          // Shift left by maxShift, with special handling for middle nodes
          // Even-count siblings [A,B,C,D]: B shifts right maxShift/2, then C shifts left FULL maxShift
          //   (not maxShift/2, because the gap is already smaller after B shifted)
          // Odd-count siblings [A,B,C,D,E]: B shifts right maxShift, C doesn't shift, D shifts left maxShift
          if (maxShift > HORIZONTAL_SPACING_MIN_SHIFT_THRESHOLD) {
            // For odd-count siblings, skip the center node entirely
            if (isMiddleRight && !isEvenCount) {
              continue
            }

            node.x = (node.x ?? 0) - maxShift
            shiftSubtreeHorizontally(node, -maxShift)
          }
        }
      })
    }
  }
}

/**
 * Adjust vertical spacing to maintain consistent gaps between parent and child nodes
 * while keeping siblings at the same depth aligned horizontally.
 *
 * This function processes the tree level by level, finding the minimum gap between
 * parent and child nodes at each depth, and adjusting all nodes at that depth to
 * ensure a consistent minimum gap throughout the tree.
 */
export const adjustVerticalNodeSpacing = (
  root: HierarchyPointNode<EventTreeNode>,
  event: Event
) => {
  // Group nodes by depth
  const nodesByDepth = groupNodesByDepth(root)

  // Process each depth level (skip root at depth 0)
  for (let depth = 1; depth < nodesByDepth.length; depth++) {
    const nodesAtDepth = nodesByDepth[depth]

    // Group nodes by their parent and calculate horizontal spreads
    const parentGroups = groupNodesByParent(nodesAtDepth)

    // Calculate max horizontal distance and log metrics for each parent group
    let maxHorizontalDistance = 0

    parentGroups.forEach((children) => {
      if (children.length > 1) {
        const xPositions = children.map((child) => child.x ?? 0).sort((a, b) => a - b)
        const leftmost = xPositions[0]
        const rightmost = xPositions[xPositions.length - 1]
        const horizontalDistance = rightmost - leftmost

        maxHorizontalDistance = Math.max(maxHorizontalDistance, horizontalDistance)
      }
    })

    // Check if all nodes at this depth are single children of their parents
    const allNodesAreSingleChildren = nodesAtDepth.every((node) => {
      return node.parent && node.parent.children && node.parent.children.length === 1
    })

    // Calculate base desired gap
    const baseGap = allNodesAreSingleChildren
      ? NODE.VERTICAL_SPACING_SHORT
      : NODE.VERTICAL_SPACING_DEFAULT

    // Add incremental spacing based on horizontal spread (10px per 1000px of horizontal distance)
    const horizontalSpreadFactor = Math.floor(maxHorizontalDistance / 1000)
    const desiredGap = baseGap + horizontalSpreadFactor * NODE.VERTICAL_SPACING_INCREMENT

    // Find the minimum gap among all nodes at this depth
    let minGap = Infinity
    nodesAtDepth.forEach((node) => {
      if (node.parent) {
        const parentHeight = getNodeHeight(node.parent.data, event)
        const nodeHeight = getNodeHeight(node.data, event)

        // Calculate current gap between bottom of parent and top of child
        const currentGap = node.y - node.parent.y - (parentHeight / 2 + nodeHeight / 2)
        minGap = Math.min(minGap, currentGap)
      }
    })

    // If the minimum gap is less than desired, shift all nodes at this depth (and deeper)
    if (minGap < desiredGap) {
      const offset = desiredGap - minGap
      nodesAtDepth.forEach((node) => {
        shiftSubtreeVertically(node, offset)
      })
    }
  }
}

/**
 * Calculate the left edge x-coordinate of a node
 */
const getNodeLeftEdgeX = (node: HierarchyPointNode<EventTreeNode>, event: Event): number => {
  const nodeWidth = getNodeWidth(node.data, event)
  return (node.x ?? 0) - nodeWidth / 2
}

/**
 * Calculate the right edge x-coordinate of a node
 */
const getNodeRightEdgeX = (node: HierarchyPointNode<EventTreeNode>, event: Event): number => {
  const nodeWidth = getNodeWidth(node.data, event)
  return (node.x ?? 0) + nodeWidth / 2
}

/**
 * Sort nodes by their x position (left to right)
 */
const sortNodesByX = (
  nodes: HierarchyPointNode<EventTreeNode>[]
): HierarchyPointNode<EventTreeNode>[] => {
  return [...nodes].sort((a, b) => (a.x ?? 0) - (b.x ?? 0))
}

/**
 * Calculate the horizontal gap between two adjacent nodes (left and right)
 * Returns the distance from the right edge of the left node to the left edge of the right node
 */
const calculateGapBetweenNodes = (
  leftNode: HierarchyPointNode<EventTreeNode>,
  rightNode: HierarchyPointNode<EventTreeNode>,
  event: Event
): number => {
  const leftRightEdge = getNodeRightEdgeX(leftNode, event)
  const rightLeftEdge = getNodeLeftEdgeX(rightNode, event)
  return rightLeftEdge - leftRightEdge
}

/**
 * Calculate the maximum safe shift amount for a node by checking all descendants.
 * Returns the minimum gap found across all depth levels, ensuring no overlaps occur.
 */
const calculateMaxShiftForNode = (
  node: HierarchyPointNode<EventTreeNode>,
  initialMaxShift: number,
  shiftDirection: 'left' | 'right',
  depth: number,
  nodesByDepth: HierarchyPointNode<EventTreeNode>[][],
  event: Event,
  minHorizontalGap: number
): number => {
  let maxShift = initialMaxShift

  // Group all descendants by depth to find boundaries at each level
  const descendants = node.descendants()
  const descendantsByDepth: HierarchyPointNode<EventTreeNode>[][] = []

  descendants.forEach((descendant) => {
    if (!descendantsByDepth[descendant.depth]) {
      descendantsByDepth[descendant.depth] = []
    }
    descendantsByDepth[descendant.depth].push(descendant)
  })

  // Check each depth level where this subtree has nodes
  for (let checkDepth = depth + 1; checkDepth < descendantsByDepth.length; checkDepth++) {
    const nodesAtThisDepth = descendantsByDepth[checkDepth]
    if (!nodesAtThisDepth || nodesAtThisDepth.length === 0) continue

    // Find the boundary node at this depth (leftmost or rightmost depending on shift direction)
    const sortedNodes = sortNodesByX(nodesAtThisDepth)
    const boundaryNode =
      shiftDirection === 'right' ? sortedNodes[sortedNodes.length - 1] : sortedNodes[0]
    const boundaryEdge =
      shiftDirection === 'right'
        ? getNodeRightEdgeX(boundaryNode, event)
        : getNodeLeftEdgeX(boundaryNode, event)

    // Check against ALL nodes at this depth to find the closest obstacle
    const closestObstacleEdge =
      shiftDirection === 'right'
        ? findClosestRightNodeEdgeX(boundaryEdge, checkDepth, nodesByDepth, event)
        : findClosestLeftNodeEdgeX(boundaryEdge, checkDepth, nodesByDepth, event)

    if (closestObstacleEdge !== null) {
      const gap =
        shiftDirection === 'right'
          ? closestObstacleEdge - boundaryEdge - minHorizontalGap
          : boundaryEdge - closestObstacleEdge - minHorizontalGap

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
 * Find the left edge of the closest node to the right of given position at given depth
 */
const findClosestRightNodeEdgeX = (
  x: number,
  checkDepth: number,
  nodesByDepth: HierarchyPointNode<EventTreeNode>[][],
  event: Event
): number | null => {
  const nodesAtCheckDepth = nodesByDepth[checkDepth] || []
  let closestEdge: number | null = null
  let minDistance = Infinity

  nodesAtCheckDepth.forEach((node) => {
    const nodeLeftEdge = getNodeLeftEdgeX(node, event)

    if (nodeLeftEdge > x) {
      const distance = nodeLeftEdge - x
      if (distance < minDistance) {
        minDistance = distance
        closestEdge = nodeLeftEdge
      }
    }
  })

  return closestEdge
}

/**
 * Find the right edge of the closest node to the left of given position at given depth
 */
const findClosestLeftNodeEdgeX = (
  x: number,
  checkDepth: number,
  nodesByDepth: HierarchyPointNode<EventTreeNode>[][],
  event: Event
): number | null => {
  const nodesAtCheckDepth = nodesByDepth[checkDepth] || []
  let closestEdge: number | null = null
  let minDistance = Infinity

  nodesAtCheckDepth.forEach((node) => {
    const nodeRightEdge = getNodeRightEdgeX(node, event)

    if (nodeRightEdge < x) {
      const distance = x - nodeRightEdge
      if (distance < minDistance) {
        minDistance = distance
        closestEdge = nodeRightEdge
      }
    }
  })

  return closestEdge
}

/**
 * Group all nodes in the tree by their depth level
 */
const groupNodesByDepth = (
  root: HierarchyPointNode<EventTreeNode>
): HierarchyPointNode<EventTreeNode>[][] => {
  const nodesByDepth: HierarchyPointNode<EventTreeNode>[][] = []
  root.descendants().forEach((node) => {
    if (!nodesByDepth[node.depth]) {
      nodesByDepth[node.depth] = []
    }
    nodesByDepth[node.depth].push(node)
  })
  return nodesByDepth
}

/**
 * Group nodes by their parent node, creating sibling groups
 */
const groupNodesByParent = (
  nodes: HierarchyPointNode<EventTreeNode>[]
): Map<HierarchyPointNode<EventTreeNode>, HierarchyPointNode<EventTreeNode>[]> => {
  const nodesByParent = new Map<
    HierarchyPointNode<EventTreeNode>,
    HierarchyPointNode<EventTreeNode>[]
  >()
  nodes.forEach((node) => {
    if (node.parent) {
      if (!nodesByParent.has(node.parent)) {
        nodesByParent.set(node.parent, [])
      }
      const siblings = nodesByParent.get(node.parent)
      if (siblings) {
        siblings.push(node)
      }
    }
  })
  return nodesByParent
}

/**
 * Recursively shift a node's descendants horizontally by the given offset
 */
const shiftSubtreeHorizontally = (node: HierarchyPointNode<EventTreeNode>, offset: number) => {
  if (node.children) {
    node.children.forEach((child) => {
      child.x = (child.x ?? 0) + offset
      shiftSubtreeHorizontally(child, offset)
    })
  }
}

/**
 * Recursively shift a node and all its descendants by the given vertical offset
 */
const shiftSubtreeVertically = (node: HierarchyPointNode<EventTreeNode>, offset: number) => {
  node.y += offset
  if (node.children) {
    node.children.forEach((child) => shiftSubtreeVertically(child, offset))
  }
}
