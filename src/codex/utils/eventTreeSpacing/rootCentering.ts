import { SMALL_TREE_MAX_NODES } from './config'
import { TreeNode } from './context'
import { calculateAverageX } from './geometry'
import { buildChildToAllParentsMap, groupNodesByDepth, groupSiblingsByParentSet } from './grouping'

/**
 * For very simple trees, centers the root node horizontally under the event
 * name, and also child nodes directly below their parents.
 *
 * Small trees may appear very far to the left of the event name, which looks
 * super weird especially after we've moved the root! This fixes that by
 * centering them as well.
 *
 * We don't do this for more complex trees... Runs into out of bounds issues
 * with the viewbox.
 */
export const centerRootNodeHorizontally = (
  root: TreeNode,
  svgWidth: number,
  offsetX: number
): void => {
  const isSmallTree = root.descendants().length <= SMALL_TREE_MAX_NODES

  // Every node in the tree has at most 1 child
  const isSimpleTree = root
    .descendants()
    .every((node) => !node.children || node.children.length <= 1)

  if (!isSimpleTree && !isSmallTree) return

  root.x = svgWidth / 2 - offsetX

  // Center children directly below their parent.
  // NOTE: Although the spacing passes already did this kind of centering,
  // we just moved the root AFTER them... so we have to center again!
  const nodesByDepth = groupNodesByDepth(root)
  for (let depth = 1; depth < nodesByDepth.length; depth++) {
    const nodesAtDepth = nodesByDepth[depth] || []
    const parentsAtPrevDepth = nodesByDepth[depth - 1] || []

    const childToAllParentsMap = buildChildToAllParentsMap(parentsAtPrevDepth)
    const siblingsByParentSet = groupSiblingsByParentSet(nodesAtDepth, childToAllParentsMap)

    // Move each sibling group so their average x lines up with their parents' average x
    siblingsByParentSet.forEach((siblings) => {
      if (siblings.length === 0) return

      const allParents = childToAllParentsMap.get(siblings[0].data.id)
      if (!allParents) return

      const offset = calculateAverageX(allParents) - calculateAverageX(siblings)

      siblings.forEach((node) => {
        node.x = (node.x ?? 0) + offset
      })
    })
  }
}
