import { TreeNode } from './context'

/**
 * Structural helpers for navigating the tree: grouping nodes by depth or
 * parent, and resolving the parent/child relationships that go beyond the
 * plain hierarchy (refChildren — nodes referenced by additional parents).
 */

const addToNodeListMap = <K>(map: Map<K, TreeNode[]>, key: K, node: TreeNode): void => {
  const existing = map.get(key)
  if (existing) {
    existing.push(node)
  } else {
    map.set(key, [node])
  }
}

/**
 * Group all nodes in the tree by their depth level
 */
export const groupNodesByDepth = (root: TreeNode): TreeNode[][] => {
  const nodesByDepth: TreeNode[][] = []
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
export const groupNodesByParent = (nodes: TreeNode[]): Map<TreeNode, TreeNode[]> => {
  const nodesByParent = new Map<TreeNode, TreeNode[]>()
  nodes.forEach((node) => {
    if (node.parent) {
      addToNodeListMap(nodesByParent, node.parent, node)
    }
  })
  return nodesByParent
}

/**
 * Find a node by ID within an array of nodes
 */
export const findNodeById = (nodes: TreeNode[] | undefined, id: number): TreeNode | undefined => {
  if (!nodes) return undefined
  return nodes.find((node) => node.data.id === id)
}

/**
 * Build a map of child ID to all parents (direct + refChildren) that reference it
 */
export const buildChildToAllParentsMap = (parentsAtDepth: TreeNode[]): Map<number, TreeNode[]> => {
  const childToParentsMap = new Map<number, TreeNode[]>()

  parentsAtDepth.forEach((parent) => {
    parent.children?.forEach((child) => {
      addToNodeListMap(childToParentsMap, child.data.id, parent)
    })
    parent.data.refChildren?.forEach((childId) => {
      addToNodeListMap(childToParentsMap, childId, parent)
    })
  })

  return childToParentsMap
}

/**
 * Build a map of child ID to the parents that reference it ONLY via refChildren
 * (direct parent links are not included)
 */
export const buildRefChildrenParentMap = (parentsAtDepth: TreeNode[]): Map<number, TreeNode[]> => {
  const refChildrenParentMap = new Map<number, TreeNode[]>()

  parentsAtDepth.forEach((parent) => {
    parent.data.refChildren?.forEach((childId) => {
      addToNodeListMap(refChildrenParentMap, childId, parent)
    })
  })

  return refChildrenParentMap
}

/**
 * Create a unique key from a set of nodes (sorted by ID)
 */
const createNodeSetKey = (nodes: TreeNode[]): string => {
  return nodes
    .map((n) => n.data.id)
    .sort()
    .join(',')
}

/**
 * Group nodes by their parent sets (siblings share the same parents).
 * Returns a map from parent set key to array of sibling nodes.
 */
export const groupSiblingsByParentSet = (
  nodes: TreeNode[],
  childToAllParentsMap: Map<number, TreeNode[]>
): Map<string, TreeNode[]> => {
  const siblingsByParentSet = new Map<string, TreeNode[]>()

  nodes.forEach((node) => {
    const allParents = childToAllParentsMap.get(node.data.id)
    if (allParents) {
      addToNodeListMap(siblingsByParentSet, createNodeSetKey(allParents), node)
    }
  })

  return siblingsByParentSet
}

/**
 * Groups parents that share any children (direct or refChildren).
 * Parents that reference the same child node should be grouped together
 * so they can be centered as a unit while maintaining their relative spacing.
 */
export const buildParentGroups = (
  parents: TreeNode[],
  childToParentsMap: Map<number, TreeNode[]>
): TreeNode[][] => {
  const groups: TreeNode[][] = []
  const parentToGroupIndex = new Map<TreeNode, number>()

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
export const getAllChildrenForParentGroup = (
  parentGroup: TreeNode[],
  nodesAtNextDepth: TreeNode[] | undefined
): TreeNode[] => {
  const childrenSet = new Set<TreeNode>()

  parentGroup.forEach((parent) => {
    parent.children?.forEach((child) => childrenSet.add(child))

    parent.data.refChildren?.forEach((childId) => {
      const refChild = findNodeById(nodesAtNextDepth, childId)
      if (refChild) {
        childrenSet.add(refChild)
      }
    })
  })

  return Array.from(childrenSet)
}
