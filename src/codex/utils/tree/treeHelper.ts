/**
 * Shared tree-traversal helpers for D3-hierarchy-based trees (talent tree + event tree).
 *
 * These are generic over the node/datum type; feature-specific concerns
 * (which dimensions a node has, which fields identify it) are passed in as callbacks.
 */

import { HierarchyNode } from 'd3-hierarchy'

/**
 * Tree bounds information for sizing and positioning the SVG
 */
export interface TreeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

/**
 * Builds a map of node key -> node data for quick O(1) lookup.
 * This is more efficient than traversing the tree hierarchy for each lookup.
 */
export const buildNodeMap = <TDatum, TKey>(
  root: HierarchyNode<TDatum>,
  getKey: (data: TDatum) => TKey
): Map<TKey, TDatum> => {
  const nodeMap = new Map<TKey, TDatum>()
  root.descendants().forEach((node) => {
    nodeMap.set(getKey(node.data), node.data)
  })
  return nodeMap
}

/**
 * Calculate bounding box for the entire tree based on positioned nodes.
 *
 * `getNodeSize` returns the node's extent along d3's x and y axes
 * ([sizeAlongX, sizeAlongY]), or null to exclude the node from the bounds
 * (e.g. a virtual root that is never rendered).
 *
 * `xIsVertical` flips the width/height mapping for trees where d3's x-axis
 * represents vertical screen position (the talent tree's rotated layout).
 */
export const calculateTreeBounds = <TDatum>(
  root: HierarchyNode<TDatum>,
  getNodeSize: (node: HierarchyNode<TDatum>) => [number, number] | null,
  { xIsVertical = false }: { xIsVertical?: boolean } = {}
): TreeBounds => {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  root.descendants().forEach((node) => {
    const size = getNodeSize(node)
    if (!size) return

    const x = node.x ?? 0
    const y = node.y ?? 0
    const [sizeAlongX, sizeAlongY] = size

    // Track edges for both X and Y
    if (x - sizeAlongX / 2 < minX) minX = x - sizeAlongX / 2
    if (x + sizeAlongX / 2 > maxX) maxX = x + sizeAlongX / 2
    if (y - sizeAlongY / 2 < minY) minY = y - sizeAlongY / 2
    if (y + sizeAlongY / 2 > maxY) maxY = y + sizeAlongY / 2
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: xIsVertical ? maxY - minY : maxX - minX,
    height: xIsVertical ? maxX - minX : maxY - minY,
  }
}

/**
 * Depth-first search for the first node matching the predicate
 */
export const findNodeInTree = <TNode>(
  node: TNode,
  getChildren: (node: TNode) => TNode[] | undefined,
  predicate: (node: TNode) => boolean
): TNode | null => {
  if (predicate(node)) return node
  for (const child of getChildren(node) ?? []) {
    const found = findNodeInTree(child, getChildren, predicate)
    if (found) return found
  }
  return null
}
