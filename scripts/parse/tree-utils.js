/* eslint-disable */
/**
 * Shared tree primitives for the event-tree parsing pipeline:
 * node creation, node-id generation, and generic tree traversal helpers.
 */

let nodeIdCounter = 0

/**
 * Generate a unique node ID (integer, unique per event)
 */
function generateNodeId() {
  return nodeIdCounter++
}

/**
 * Reset the node ID counter (called at the start of each event's tree build)
 */
function resetNodeIdCounter() {
  nodeIdCounter = 0
}

/**
 * Create a node with consistent field ordering
 *
 * Field order: id, text, type, choiceLabel, requirements, effects, numContinues, ref, children
 * Optional fields are only included if they have values.
 */
function createNode({
  id,
  text,
  type,
  choiceLabel,
  requirements,
  effects,
  numContinues,
  ref,
  children,
}) {
  const isDefault = choiceLabel === 'default'
  const node = {
    id,
    text,
    type,
  }

  if (choiceLabel !== undefined) {
    node.choiceLabel = choiceLabel
  }

  if (requirements !== undefined && requirements.length > 0) {
    node.requirements = requirements
  } else if (isDefault) {
    node.requirements = ['All other paths are unreachable!']
  }

  if (effects !== undefined && effects.length > 0) {
    node.effects = effects
  }

  // Add numContinues for dialogue nodes
  if (type === 'dialogue' && numContinues !== undefined) {
    node.numContinues = numContinues
  }

  // Add ref field if this is a reference node
  if (ref !== undefined) {
    node.ref = ref
  }

  if (children !== undefined && children.length > 0) {
    node.children = children
  }

  return node
}


/**
 * Build a map of node ID to node for a tree
 */
function buildNodeMapForTree(rootNode) {
  const nodeMap = new Map()
  function buildNodeMap(node) {
    if (!node) return
    nodeMap.set(node.id, node)
    if (node.children) {
      node.children.forEach((child) => buildNodeMap(child))
    }
  }
  buildNodeMap(rootNode)
  return nodeMap
}

/**
 * Find all invalid refs in a tree (refs pointing to non-existent nodes)
 * Each entry includes nodeId, refTarget, and identity (text or choiceLabel) for comparison.
 */
function findInvalidRefsInTree(rootNode, nodeMap) {
  const invalidRefs = []
  function checkRefs(node) {
    if (!node) return
    if (node.ref !== undefined && !nodeMap.has(node.ref)) {
      const identity = node.choiceLabel || (node.text ? node.text.slice(0, 120) : '') || '(no text)'
      invalidRefs.push({ nodeId: node.id, refTarget: node.ref, identity })
    }
    if (node.children) {
      node.children.forEach((child) => checkRefs(child))
    }
  }
  checkRefs(rootNode)
  return invalidRefs
}


/**
 * Count total nodes in a tree
 */
function countNodes(node) {
  if (!node) return 0
  let count = 1
  if (node.children) {
    count += node.children.reduce((sum, child) => sum + countNodes(child), 0)
  }
  return count
}

/**
 * Get maximum depth of a tree
 */
function getMaxDepth(node, currentDepth = 0) {
  if (!node) return currentDepth
  if (!node.children || node.children.length === 0) {
    return currentDepth + 1
  }
  return Math.max(...node.children.map((child) => getMaxDepth(child, currentDepth + 1)))
}

/**
 * Get descendant count at a specific depth for a node
 * @param {Object} node - The node to check
 * @param {number} depth - How many levels down to count (1 = children, 2 = grandchildren, etc.)
 * @returns {number} Count of descendants at the specified depth
 */
function getDescendantCountAtDepth(node, depth) {
  if (depth <= 0 || !node.children || node.children.length === 0) return 0
  if (depth === 1) return node.children.length
  // For depth > 1, sum up descendants at that depth from all children
  return node.children.reduce((sum, child) => sum + getDescendantCountAtDepth(child, depth - 1), 0)
}


module.exports = {
  generateNodeId,
  resetNodeIdCounter,
  createNode,
  buildNodeMapForTree,
  findInvalidRefsInTree,
  countNodes,
  getMaxDepth,
  getDescendantCountAtDepth,
}
