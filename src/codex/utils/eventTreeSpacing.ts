import { HierarchyPointNode } from 'd3-hierarchy'

import { Event, EventTreeNode } from '@/codex/types/events'
import { NODE } from '@/codex/constants/eventTreeValues'
import { LevelOfDetail } from '@/codex/constants/eventSearchValues'

import { getNodeDimensions, getNodeWidth, type NodeMap } from './eventNodeDimensions'

const HORIZONTAL_SPACING_CONFIG = {
  pass1Enabled: true,
  pass1_5Enabled: true,
  pass2Enabled: true,
  pass3Enabled: true,

  pass2MaxIterations: 10,
  pass3MaxIterations: 10,

  pass2MinShiftThreshold: 1,
  pass3MinShiftThreshold: 1,
}

/**
 * Adjust horizontal spacing to prevent node overlaps when nodes have different widths.
 *
 * - Pass 1: Position children centered under each parent (ignoring overlaps)
 * - Pass 1.5: Adjust children with multiple parents (direct + refChildren) to center under average of all parents
 * - Pass 2: Fix overlaps by moving parent subtrees apart and recentering parent groups over shared children
 * - Pass 3: Tighten gaps by looking for large gaps between sibling subtrees and moving them closer
 * - Final: Re-run pass 1.5 after tightening (pass 3 can drag shared nodes off-center)
 *
 * NOTE: Events with nodes that are both direct children of one parent AND refChildren of multiple
 * other parents can cause iterative drift in Pass 2 and Pass 3. The horizontal spacing logic
 * doesn't properly handle the case where a node's position is controlled by one parent but it's
 * also referenced by others. Such events should be blacklisted from refChildren creation in
 * parse-event-trees.js (see REF_CHILDREN_BLACKLIST).
 */
export const adjustHorizontalNodeSpacing = (
  nodeMap: NodeMap,
  root: HierarchyPointNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
) => {
  const minHorizontalGap = NODE.HORIZONTAL_SPACING_DEFAULT
  const nodesByDepth = groupNodesByDepth(root)
  const runMultiParentChildCentering = (): boolean => {
    let madeAdjustment = false

    for (let depth = 1; depth < nodesByDepth.length; depth++) {
      const nodesAtDepth = nodesByDepth[depth] || []
      const parentsAtPrevDepth = nodesByDepth[depth - 1] || []

      const childToAllParentsMap = buildChildToAllParentsMap(parentsAtPrevDepth)

      nodesAtDepth.forEach((child) => {
        const allParents = childToAllParentsMap.get(child.data.id)

        // If this child has multiple parents (direct + ref), center it under all of them
        if (allParents && allParents.length > 1) {
          // Calculate average X position of all parents
          const avgParentX = calculateAverageX(allParents)

          // Calculate offset to move this child to center under average
          const currentChildX = child.x ?? 0
          const desiredOffset = avgParentX - currentChildX

          // Only apply if significant
          if (Math.abs(desiredOffset) > minHorizontalGap / 10) {
            // Clamp the shift so we don't introduce overlaps when pulling a shared subtree
            const direction = desiredOffset < 0 ? 'left' : 'right'
            const maxSafeShift = calculateMaxShiftForNode(
              nodeMap,
              child,
              Math.abs(desiredOffset),
              direction,
              Math.max(0, child.depth - 1),
              nodesByDepth,
              event,
              minHorizontalGap,
              showLoopingIndicator,
              levelOfDetail,
              showContinuesTags
            )

            if (maxSafeShift > minHorizontalGap / 10) {
              const appliedShift = direction === 'left' ? -maxSafeShift : maxSafeShift
              child.x = (child.x ?? 0) + appliedShift
              shiftSubtreeHorizontally(child, appliedShift)
              madeAdjustment = true
            }
          }
        }
      })
    }

    return madeAdjustment
  }

  // PASS 1: Position children, centered, under parents (ignore overlaps)
  if (HORIZONTAL_SPACING_CONFIG.pass1Enabled) {
    for (let depth = 0; depth < nodesByDepth.length; depth++) {
      const parentsAtDepth = nodesByDepth[depth] || []

      parentsAtDepth.forEach((parent) => {
        if (!parent.children || parent.children.length === 0) return

        // Calculate total width needed for all children with gaps
        let totalWidth = 0
        const childWidths = parent.children.map((child) =>
          getNodeWidth(
            nodeMap,
            child.data,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )
        )

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

  // PASS 1.5: Adjust children with multiple parents to be centered under all parents
  // This handles cases where a child has both a direct parent and refChildren parents
  if (HORIZONTAL_SPACING_CONFIG.pass1_5Enabled) {
    runMultiParentChildCentering()
  }

  // PASS 2: Iteratively fix overlaps and recenter ancestors
  // Run multiple iterations until no adjustments are made
  if (HORIZONTAL_SPACING_CONFIG.pass2Enabled) {
    let iteration = 0
    let madeAdjustment = true

    while (madeAdjustment && iteration < HORIZONTAL_SPACING_CONFIG.pass2MaxIterations) {
      madeAdjustment = false
      iteration++

      if (iteration === HORIZONTAL_SPACING_CONFIG.pass2MaxIterations) {
        logMaxIterationsWarning(
          'Pass 2',
          HORIZONTAL_SPACING_CONFIG.pass2MaxIterations,
          'Tree may still have overlaps.'
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

            const currentGap = calculateGapBetweenNodes(
              nodeMap,
              leftSibling,
              rightSibling,
              event,
              showLoopingIndicator,
              levelOfDetail,
              showContinuesTags
            )

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
        // We only need to consider direct children here. Including refChildren
        // does not make sense for spacing calculations, as they don't take up any extra space.
        const parentsAtPrevDepth = nodesByDepth[depth - 1] || []
        const sortedParents = sortNodesByX(parentsAtPrevDepth)

        // Filter to only parents that have children at this depth
        // This prevents "blind spots" where a parent with no children at this depth
        // sits between two parents that do have children, preventing their children from being checked
        // Include ONLY direct children!
        const parentsWithChildrenAtDepth = sortedParents.filter(
          (parent) => (parent.children || []).length > 0
        )

        // Check each adjacent pair of parents (that have children)
        for (let i = 0; i < parentsWithChildrenAtDepth.length - 1; i++) {
          const leftParent = parentsWithChildrenAtDepth[i]
          const rightParent = parentsWithChildrenAtDepth[i + 1]

          // Get all children (direct only) for both parents
          const leftChildren: HierarchyPointNode<EventTreeNode>[] = [...(leftParent.children || [])]
          const rightChildren: HierarchyPointNode<EventTreeNode>[] = [
            ...(rightParent.children || []),
          ]

          if (leftChildren.length === 0 || rightChildren.length === 0) continue

          // Sort children by x to find the boundary children
          const leftChildrenSorted = sortNodesByX(leftChildren)
          const rightChildrenSorted = sortNodesByX(rightChildren)

          const rightmostLeftChild = leftChildrenSorted[leftChildrenSorted.length - 1]
          const leftmostRightChild = rightChildrenSorted[0]
          const currentGap = calculateGapBetweenNodes(
            nodeMap,
            rightmostLeftChild,
            leftmostRightChild,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )

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

      // 3 -- Recenter parent groups over their shared children
      // Parents that share children (via direct or refChildren) are centered as a group
      // to maintain their relative spacing while positioning them over their children
      // Work from bottom to top (deepest to shallowest)
      for (let depth = nodesByDepth.length - 2; depth >= 0; depth--) {
        const nodesAtDepth = nodesByDepth[depth] || []

        const childToParentsMap = new Map<number, HierarchyPointNode<EventTreeNode>[]>()

        nodesAtDepth.forEach((parent) => {
          if (parent.children) {
            parent.children.forEach((child) => {
              if (!childToParentsMap.has(child.data.id)) {
                childToParentsMap.set(child.data.id, [])
              }
              const parents = childToParentsMap.get(child.data.id)
              if (parents) {
                parents.push(parent)
              }
            })
          }

          // Track refChildren
          if (parent.data.refChildren) {
            parent.data.refChildren.forEach((childId) => {
              if (!childToParentsMap.has(childId)) {
                childToParentsMap.set(childId, [])
              }
              const parents = childToParentsMap.get(childId)
              if (parents) {
                parents.push(parent)
              }
            })
          }
        })

        // Group parents that share ANY children
        const parentGroups = buildParentGroups(nodesAtDepth, childToParentsMap)

        // Recenter each group
        parentGroups.forEach((group) => {
          // Get all children for this group
          const allChildren = getAllChildrenForParentGroup(group, nodesByDepth[depth + 1])

          if (allChildren.length === 0) return

          // Calculate average X positions
          const parentGroupAvgX = group.reduce((sum, p) => sum + (p.x ?? 0), 0) / group.length
          const childrenAvgX =
            allChildren.reduce((sum, c) => sum + (c.x ?? 0), 0) / allChildren.length

          // Calculate offset to center the group
          const offset = childrenAvgX - parentGroupAvgX

          // Only apply if significant
          if (Math.abs(offset) > HORIZONTAL_SPACING_CONFIG.pass2MinShiftThreshold) {
            // Shift ALL parents in the group by the same offset
            group.forEach((parent) => {
              parent.x = (parent.x ?? 0) + offset
            })
            madeAdjustment = true

            // Don't shift subtrees here - children are already positioned correctly
            // Only the parent nodes themselves move to recenter
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
  // Run multiple iterations because tightening at deeper levels can create opportunities
  // for tightening at shallower levels (needs to propagate upward through the tree)
  if (HORIZONTAL_SPACING_CONFIG.pass3Enabled) {
    let iteration = 0
    let madeAdjustment = true

    while (madeAdjustment && iteration < HORIZONTAL_SPACING_CONFIG.pass3MaxIterations) {
      madeAdjustment = false
      iteration++

      if (iteration === HORIZONTAL_SPACING_CONFIG.pass3MaxIterations) {
        logMaxIterationsWarning(
          'Pass 3',
          HORIZONTAL_SPACING_CONFIG.pass3MaxIterations,
          'Tree may not be fully tightened.'
        )
      }

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
            const initialGap =
              calculateGapBetweenNodes(
                nodeMap,
                node,
                rightSibling,
                event,
                showLoopingIndicator,
                levelOfDetail,
                showContinuesTags
              ) - minHorizontalGap

            if (initialGap <= 0) continue // Already at minimum gap, no tightening possible

            // Check all descendants to find maximum safe shift amount
            const maxShift = calculateMaxShiftForNode(
              nodeMap,
              node,
              initialGap,
              'right',
              depth,
              nodesByDepth,
              event,
              minHorizontalGap,
              showLoopingIndicator,
              levelOfDetail,
              showContinuesTags
            )

            // Shift right by maxShift (or maxShift/2 for even-count middle-left node)
            // Even-count [A,B,C,D]: B shifts by maxShift/2 to move symmetrically toward center
            // Odd-count [A,B,C,D,E]: B shifts by full maxShift (center C will not shift)
            if (maxShift > HORIZONTAL_SPACING_CONFIG.pass3MinShiftThreshold) {
              madeAdjustment = true
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
            const initialGap =
              calculateGapBetweenNodes(
                nodeMap,
                leftSibling,
                node,
                event,
                showLoopingIndicator,
                levelOfDetail,
                showContinuesTags
              ) - minHorizontalGap

            if (initialGap <= 0) continue // Already at minimum gap, no tightening possible

            // Check all descendants to find maximum safe shift amount
            const maxShift = calculateMaxShiftForNode(
              nodeMap,
              node,
              initialGap,
              'left',
              depth,
              nodesByDepth,
              event,
              minHorizontalGap,
              showLoopingIndicator,
              levelOfDetail,
              showContinuesTags
            )

            // Shift left by maxShift, with special handling for middle nodes
            // Even-count siblings [A,B,C,D]: B shifts right maxShift/2, then C shifts left FULL maxShift
            //   (not maxShift/2, because the gap is already smaller after B shifted)
            // Odd-count siblings [A,B,C,D,E]: B shifts right maxShift, C doesn't shift, D shifts left maxShift
            if (maxShift > HORIZONTAL_SPACING_CONFIG.pass3MinShiftThreshold) {
              // For odd-count siblings, skip the center node entirely
              if (isMiddleRight && !isEvenCount) {
                continue
              }

              madeAdjustment = true
              node.x = (node.x ?? 0) - maxShift
              shiftSubtreeHorizontally(node, -maxShift)
            }
          }
        })
      }
    }
  }

  // FINAL: After tightening, recenter multi-parent children again.
  // Pass 3 can shift the "real-parent" subtree and drag a shared node away from its
  // desired average-of-parents position.
  if (HORIZONTAL_SPACING_CONFIG.pass1_5Enabled && HORIZONTAL_SPACING_CONFIG.pass3Enabled) {
    runMultiParentChildCentering()
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
  nodeMap: NodeMap,
  root: HierarchyPointNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
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

    // Check if any nodes at previous depth has refChildren
    const nodesAtPrevDepth = depth > 0 ? nodesByDepth[depth - 1] || [] : []
    const anyParentHasRefChildren = nodesAtPrevDepth.some(
      ({ data }) => data.refChildren && data.refChildren.length > 0
    )

    const baseGap =
      allNodesAreSingleChildren && !anyParentHasRefChildren
        ? NODE.VERTICAL_SPACING_SHORT_BY_LEVEL_OF_DETAIL[levelOfDetail]
        : NODE.VERTICAL_SPACING_DEFAULT

    // Add incremental spacing based on horizontal spread (10px per 1000px of horizontal distance)
    const horizontalSpreadFactor = Math.floor(maxHorizontalDistance / 1000)
    const desiredGap = baseGap + horizontalSpreadFactor * NODE.VERTICAL_SPACING_INCREMENT

    // Build a reverse map: nodeId -> nodes at previous depth that have this node in refChildren
    const refChildrenParentMap = new Map<number, HierarchyPointNode<EventTreeNode>[]>()
    nodesAtPrevDepth.forEach((parent) => {
      if (parent.data.refChildren && parent.data.refChildren.length > 0) {
        parent.data.refChildren.forEach((childId) => {
          if (!refChildrenParentMap.has(childId)) {
            refChildrenParentMap.set(childId, [])
          }
          const refParents = refChildrenParentMap.get(childId)
          if (refParents) {
            refParents.push(parent)
          }
        })
      }
    })

    // Find the minimum gap among all nodes at this depth
    // Check BOTH direct parent links AND refChildren links
    let minGap = Infinity
    nodesAtDepth.forEach((node) => {
      // 1. Check direct parent link
      if (node.parent) {
        const [, parentHeight] = getNodeDimensions(
          nodeMap,
          node.parent.data,
          event,
          showLoopingIndicator,
          levelOfDetail,
          showContinuesTags
        )

        const [, nodeHeight] = getNodeDimensions(
          nodeMap,
          node.data,
          event,
          showLoopingIndicator,
          levelOfDetail,
          showContinuesTags
        )

        // Calculate current gap between bottom of parent and top of child
        const currentGap = node.y - node.parent.y - (parentHeight / 2 + nodeHeight / 2)
        minGap = Math.min(minGap, currentGap)
      }

      // 2. Check refChildren links (nodes at previous depth that reference this node)
      const refParents = refChildrenParentMap.get(node.data.id)
      if (refParents) {
        refParents.forEach((refParent) => {
          const [, refParentHeight] = getNodeDimensions(
            nodeMap,
            refParent.data,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )
          const [, nodeHeight] = getNodeDimensions(
            nodeMap,
            node.data,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )

          // Calculate gap between bottom of refParent and top of this node
          const currentGap = node.y - refParent.y - (refParentHeight / 2 + nodeHeight / 2)
          minGap = Math.min(minGap, currentGap)
        })
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
 * Log a warning when a spacing pass reaches maximum iterations
 */
const logMaxIterationsWarning = (passName: string, maxIterations: number, message: string) => {
  // eslint-disable-next-line no-console
  console.error(
    `adjustHorizontalNodeSpacing: ${passName} reached maximum iterations (${maxIterations}). ${message}`
  )
}

/**
 * Calculate the left edge x-coordinate of a node
 */
const getNodeLeftEdgeX = (
  nodeMap: NodeMap,
  node: HierarchyPointNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): number => {
  const nodeWidth = getNodeWidth(
    nodeMap,
    node.data,
    event,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
  )

  return (node.x ?? 0) - nodeWidth / 2
}

/**
 * Calculate the right edge x-coordinate of a node
 */
const getNodeRightEdgeX = (
  nodeMap: NodeMap,
  node: HierarchyPointNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): number => {
  const nodeWidth = getNodeWidth(
    nodeMap,
    node.data,
    event,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
  )

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
  nodeMap: NodeMap,
  leftNode: HierarchyPointNode<EventTreeNode>,
  rightNode: HierarchyPointNode<EventTreeNode>,
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): number => {
  const leftRightEdge = getNodeRightEdgeX(
    nodeMap,
    leftNode,
    event,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
  )
  const rightLeftEdge = getNodeLeftEdgeX(
    nodeMap,
    rightNode,
    event,
    showLoopingIndicator,
    levelOfDetail,
    showContinuesTags
  )
  return rightLeftEdge - leftRightEdge
}

/**
 * Calculate the maximum safe shift amount for a node by checking all descendants.
 * Returns the minimum gap found across all depth levels, ensuring no overlaps occur.
 */
const calculateMaxShiftForNode = (
  nodeMap: NodeMap,
  node: HierarchyPointNode<EventTreeNode>,
  initialMaxShift: number,
  shiftDirection: 'left' | 'right',
  depth: number,
  nodesByDepth: HierarchyPointNode<EventTreeNode>[][],
  event: Event,
  minHorizontalGap: number,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
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
        ? getNodeRightEdgeX(
            nodeMap,
            boundaryNode,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )
        : getNodeLeftEdgeX(
            nodeMap,
            boundaryNode,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )

    // Check against ALL nodes at this depth to find the closest obstacle
    const closestObstacleEdge =
      shiftDirection === 'right'
        ? findClosestRightNodeEdgeX(
            nodeMap,
            boundaryEdge,
            checkDepth,
            nodesByDepth,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )
        : findClosestLeftNodeEdgeX(
            nodeMap,
            boundaryEdge,
            checkDepth,
            nodesByDepth,
            event,
            showLoopingIndicator,
            levelOfDetail,
            showContinuesTags
          )

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

/*
 * For very simple trees, centers the root node horizontally under the event name,
 * and also child nodes directly below their parents.
 *
 * Small trees may appear very far to the left of the event name. Which looks super weird
 * especially after we've moved the root! This fixes that by centering them as well!
 *
 * We don't do this for more complex trees... Runs into out of bounds issues with the viewbox.
 */
export const centerRootNodeHorizontally = (
  root: HierarchyPointNode<EventTreeNode>,
  svgWidth: number,
  offsetX: number
) => {
  const isSmallTree = root.descendants().length <= 4

  // Every node in the tree has at most 1 child
  const isSimpleTree = root
    .descendants()
    .every((node) => !node.children || node.children.length <= 1)

  if (!isSimpleTree && !isSmallTree) return

  root.x = svgWidth / 2 - offsetX

  // Center children directly below their parent
  // NOTE: Although our `adjustHorizontalNodeSpacing` is already doing this kind of centering,
  // we are moving the root node here AFTER that... so we have to center again!
  const nodesByDepth = groupNodesByDepth(root)
  for (let depth = 0; depth < nodesByDepth.length; depth++) {
    const nodesAtDepth = nodesByDepth[depth] || []
    const parentsAtPrevDepth = nodesByDepth[depth - 1] || []

    const childToAllParentsMap = buildChildToAllParentsMap(parentsAtPrevDepth)
    const siblingsByParentSet = groupSiblingsByParentSet(nodesAtDepth, childToAllParentsMap)

    // Move each sibling group so their average x equals avgParentX
    siblingsByParentSet.forEach((siblings) => {
      if (siblings.length === 0) return

      const allParents = childToAllParentsMap.get(siblings[0].data.id)
      if (!allParents) return

      const avgParentX = calculateAverageX(allParents)

      // Calculate current average x of the sibling group
      const currentAvgX = siblings.reduce((sum, s) => sum + (s.x ?? 0), 0) / siblings.length
      // Calculate offset needed to center the group
      const offset = avgParentX - currentAvgX

      siblings.forEach((node) => {
        node.x = (node.x ?? 0) + offset
      })
    })
  }
}

/**
 * Find the left edge of the closest node to the right of given position at given depth
 */
const findClosestRightNodeEdgeX = (
  nodeMap: NodeMap,
  x: number,
  checkDepth: number,
  nodesByDepth: HierarchyPointNode<EventTreeNode>[][],
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): number | null => {
  const nodesAtCheckDepth = nodesByDepth[checkDepth] || []
  let closestEdge: number | null = null
  let minDistance = Infinity

  nodesAtCheckDepth.forEach((node) => {
    const nodeLeftEdge = getNodeLeftEdgeX(
      nodeMap,
      node,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )

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
  nodeMap: NodeMap,
  x: number,
  checkDepth: number,
  nodesByDepth: HierarchyPointNode<EventTreeNode>[][],
  event: Event,
  showLoopingIndicator: boolean,
  levelOfDetail: LevelOfDetail,
  showContinuesTags: boolean
): number | null => {
  const nodesAtCheckDepth = nodesByDepth[checkDepth] || []
  let closestEdge: number | null = null
  let minDistance = Infinity

  nodesAtCheckDepth.forEach((node) => {
    const nodeRightEdge = getNodeRightEdgeX(
      nodeMap,
      node,
      event,
      showLoopingIndicator,
      levelOfDetail,
      showContinuesTags
    )

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

/**
 * Find a node by ID within an array of nodes
 */
const findNodeById = (
  nodes: HierarchyPointNode<EventTreeNode>[] | undefined,
  id: number
): HierarchyPointNode<EventTreeNode> | undefined => {
  if (!nodes) return undefined
  return nodes.find((node) => node.data.id === id)
}

/**
 * Build a map of child ID to all parents (direct + refChildren) that reference it
 */
const buildChildToAllParentsMap = (
  parentsAtDepth: HierarchyPointNode<EventTreeNode>[]
): Map<number, HierarchyPointNode<EventTreeNode>[]> => {
  const childToParentsMap = new Map<number, HierarchyPointNode<EventTreeNode>[]>()

  parentsAtDepth.forEach((parent) => {
    // Track direct children
    if (parent.children) {
      parent.children.forEach((child) => {
        if (!childToParentsMap.has(child.data.id)) {
          childToParentsMap.set(child.data.id, [])
        }
        const parents = childToParentsMap.get(child.data.id)
        if (parents) {
          parents.push(parent)
        }
      })
    }

    // Track refChildren
    if (parent.data.refChildren) {
      parent.data.refChildren.forEach((childId) => {
        if (!childToParentsMap.has(childId)) {
          childToParentsMap.set(childId, [])
        }
        const parents = childToParentsMap.get(childId)
        if (parents) {
          parents.push(parent)
        }
      })
    }
  })

  return childToParentsMap
}

/**
 * Calculate the average X position of a set of nodes
 */
const calculateAverageX = (nodes: HierarchyPointNode<EventTreeNode>[]): number => {
  return nodes.reduce((sum, n) => sum + (n.x ?? 0), 0) / nodes.length
}

/**
 * Create a unique key from a set of nodes (sorted by ID)
 */
const createNodeSetKey = (nodes: HierarchyPointNode<EventTreeNode>[]): string => {
  return nodes
    .map((n) => n.data.id)
    .sort()
    .join(',')
}

/**
 * Group nodes by their parent sets (siblings share the same parents)
 * Returns a map from parent set key to array of sibling nodes
 */
const groupSiblingsByParentSet = (
  nodes: HierarchyPointNode<EventTreeNode>[],
  childToAllParentsMap: Map<number, HierarchyPointNode<EventTreeNode>[]>
): Map<string, HierarchyPointNode<EventTreeNode>[]> => {
  const siblingsByParentSet = new Map<string, HierarchyPointNode<EventTreeNode>[]>()

  nodes.forEach((node) => {
    const allParents = childToAllParentsMap.get(node.data.id)
    if (allParents) {
      const parentKey = createNodeSetKey(allParents)
      if (!siblingsByParentSet.has(parentKey)) {
        siblingsByParentSet.set(parentKey, [])
      }
      siblingsByParentSet.get(parentKey)?.push(node)
    }
  })

  return siblingsByParentSet
}

/**
 * Groups parents that share any children (direct or refChildren).
 * Parents that reference the same child node should be grouped together
 * so they can be centered as a unit while maintaining their relative spacing.
 */
const buildParentGroups = (
  parents: HierarchyPointNode<EventTreeNode>[],
  childToParentsMap: Map<number, HierarchyPointNode<EventTreeNode>[]>
): HierarchyPointNode<EventTreeNode>[][] => {
  const groups: HierarchyPointNode<EventTreeNode>[][] = []
  const parentToGroupIndex = new Map<HierarchyPointNode<EventTreeNode>, number>()

  // For each child that has multiple parents, group those parents together
  childToParentsMap.forEach((parentsOfChild) => {
    if (parentsOfChild.length > 1) {
      // Multiple parents share this child - they should be in the same group
      const existingGroupIndices = parentsOfChild
        .map((p) => parentToGroupIndex.get(p))
        .filter((idx): idx is number => idx !== undefined)

      if (existingGroupIndices.length === 0) {
        // No parent is in a group yet - create new group
        const newGroupIndex = groups.length
        groups.push([...parentsOfChild])
        parentsOfChild.forEach((p) => parentToGroupIndex.set(p, newGroupIndex))
      } else {
        // Merge all parents into the first existing group
        const targetGroupIndex = existingGroupIndices[0]
        parentsOfChild.forEach((p) => {
          if (!parentToGroupIndex.has(p)) {
            groups[targetGroupIndex].push(p)
            parentToGroupIndex.set(p, targetGroupIndex)
          }
        })

        // If multiple groups exist, merge them all into the target group
        const uniqueGroupIndices = Array.from(new Set(existingGroupIndices))
        if (uniqueGroupIndices.length > 1) {
          uniqueGroupIndices.slice(1).forEach((idx) => {
            groups[idx].forEach((p) => {
              if (!groups[targetGroupIndex].includes(p)) {
                groups[targetGroupIndex].push(p)
              }
              parentToGroupIndex.set(p, targetGroupIndex)
            })
            groups[idx] = [] // Mark for removal
          })
        }
      }
    }
  })

  // Add single-parent nodes as individual groups (parents that don't share children)
  parents.forEach((parent) => {
    if (
      !parentToGroupIndex.has(parent) &&
      (parent.children?.length || parent.data.refChildren?.length)
    ) {
      groups.push([parent])
    }
  })

  // Filter out empty groups (from merging)
  return groups.filter((g) => g.length > 0)
}

/**
 * Collects all children (direct + refChildren) for a group of parents
 */
const getAllChildrenForParentGroup = (
  parentGroup: HierarchyPointNode<EventTreeNode>[],
  nodesAtNextDepth: HierarchyPointNode<EventTreeNode>[] | undefined
): HierarchyPointNode<EventTreeNode>[] => {
  const childrenSet = new Set<HierarchyPointNode<EventTreeNode>>()

  parentGroup.forEach((parent) => {
    // Add direct children
    if (parent.children) {
      parent.children.forEach((child) => childrenSet.add(child))
    }

    // Add refChildren
    if (parent.data.refChildren && nodesAtNextDepth) {
      parent.data.refChildren.forEach((childId) => {
        const refChild = findNodeById(nodesAtNextDepth, childId)
        if (refChild) {
          childrenSet.add(refChild)
        }
      })
    }
  })

  return Array.from(childrenSet)
}
