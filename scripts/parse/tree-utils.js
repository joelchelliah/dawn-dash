// @ts-check
/**
 * Shared tree primitives for the event-tree parsing pipeline:
 * node creation, node-id generation, and generic tree traversal helpers.
 *
 * This module also defines the ParseNode typedef — the single JSDoc definition of the
 * node shape the parser produces. It is deliberately a SUPERSET of the app's
 * EventTreeNode union (src/codex/types/events.ts): during parsing a node may
 * temporarily carry any combination of fields (e.g. a dialogue node still holding its
 * choiceLabel before separateChoicesFromEffects splits it into two nodes). The `type`
 * field reuses the app's EventNodeType, so a renamed/added node type shows up here.
 */

/**
 * @typedef {import('../../src/codex/types/events').EventNodeType} EventNodeType
 */

/**
 * The parser's working node shape (see module doc).
 * @typedef {Object} ParseNode
 * @property {number} id
 * @property {string} [text]
 * @property {EventNodeType} type
 * @property {string} [choiceLabel]
 * @property {string[]} [requirements]
 * @property {string[]} [effects]
 * @property {number} [numContinues]
 * @property {number} [ref] - id of the node this node is a reference/jump-link to
 * @property {number[]} [refChildren] - ids of nodes rendered as converging lines
 * @property {ParseNode[]} [children]
 */

let nodeIdCounter = 0

/**
 * Generate a unique node ID (integer, unique per event)
 * @returns {number}
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
 *
 * @param {Partial<ParseNode>} fields - id and type are expected by every caller
 * @returns {ParseNode}
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
  // Built up field-by-field below; the cast covers the optional fields added conditionally
  const node = /** @type {ParseNode} */ ({
    id,
    text,
    type,
  })

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
 * @param {ParseNode} rootNode
 * @returns {Map<number, ParseNode>}
 */
function buildNodeMapForTree(rootNode) {
  const nodeMap = new Map()
  /** @param {ParseNode} node */
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
 * @param {ParseNode} rootNode
 * @param {Map<number, ParseNode>} nodeMap
 * @returns {Array<{ nodeId: number, refTarget: number, identity: string }>}
 */
function findInvalidRefsInTree(rootNode, nodeMap) {
  /** @type {Array<{ nodeId: number, refTarget: number, identity: string }>} */
  const invalidRefs = []
  /** @param {ParseNode} node */
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
 * @param {ParseNode} node
 * @returns {number}
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
 * @param {ParseNode} node
 * @param {number} [currentDepth]
 * @returns {number}
 */
function getMaxDepth(node, currentDepth = 0) {
  if (!node) return currentDepth
  if (!node.children || node.children.length === 0) {
    return currentDepth + 1
  }
  return Math.max(...node.children.map((child) => getMaxDepth(child, currentDepth + 1)))
}

module.exports = {
  generateNodeId,
  resetNodeIdCounter,
  createNode,
  buildNodeMapForTree,
  findInvalidRefsInTree,
  countNodes,
  getMaxDepth,
}
