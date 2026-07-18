/* eslint-disable */
/**
 * Small standalone post-processing passes:
 * - checkInvalidRefs: report refs pointing to non-existent nodes (logging only)
 * - replaceCardIdsInNode: replace numeric card/talent IDs with names in text/labels/effects
 * - filterDefaultNodes: drop 'default' nodes (and their subtrees) for blacklisted events
 */
const { debugConfig } = require('./debug.js')
const { buildNodeMapForTree, findInvalidRefsInTree } = require('./tree-utils.js')

/**
 * Check for invalid refs across all event trees and log results
 */
function checkInvalidRefs(eventTrees) {
  console.log('\n🔍 Checking for invalid refs...')
  let totalInvalidRefs = 0
  const eventsWithInvalidRefs = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) return

    const nodeMap = buildNodeMapForTree(tree.rootNode)
    const invalidRefs = findInvalidRefsInTree(tree.rootNode, nodeMap)

    if (invalidRefs.length > 0) {
      totalInvalidRefs += invalidRefs.length
      eventsWithInvalidRefs.push({
        name: tree.name,
        invalidRefs: invalidRefs.length,
        examples: invalidRefs.slice(0, 5), // For identity comparison
      })
    }
  })

  if (totalInvalidRefs > 0) {
    console.warn(
      `  ⚠️  Found ${totalInvalidRefs} invalid refs across ${eventsWithInvalidRefs.length} events`
    )
    console.warn('  Events:', eventsWithInvalidRefs.map((e) => e.name).join(', '))
    console.log('\n  Invalid refs by event (identity = choiceLabel or text):')
    eventsWithInvalidRefs.forEach(({ name, invalidRefs, examples }) => {
      console.log(`    "${name}":`)
      examples.forEach(({ nodeId, refTarget, identity }) => {
        const short = identity.length > 80 ? identity.slice(0, 77) + '...' : identity
        console.log(`      Node ${nodeId} -> ${refTarget}  "${short}"`)
      })
    })
    if (debugConfig.eventName.length > 0) {
      console.log('\n 📜 All invalid refs:')
      eventsWithInvalidRefs.forEach(({ name, examples }) => {
        examples.forEach(({ nodeId, refTarget }) => {
          console.log(`    - "${name}" Node ${nodeId} -> ${refTarget} (target not found)`)
        })
      })
    }

    if (debugConfig.eventName.length > 0) {
      const debugTree = eventTrees.find((t) => t.name === debugConfig.eventName)
      if (debugTree?.rootNode) {
        const nodeMap = buildNodeMapForTree(debugTree.rootNode)
        const invalidRefs = findInvalidRefsInTree(debugTree.rootNode, nodeMap)
        if (invalidRefs.length > 0) {
          console.log(`\n  Debug event "${debugConfig.eventName}" invalid refs (showing up to 25):`)
          invalidRefs.slice(0, 25).forEach(({ nodeId, refTarget }) => {
            console.log(`    - Node ${nodeId} -> ${refTarget} (target not found)`)
          })
        }
      }
    }
  } else {
    console.log(`  ✅ No invalid refs found`)
  }
}


// Commands that take card/talent IDs as values (replace numeric ID with name)
const CARD_ID_COMMANDS = [
  'AREAEFFECT',
  'ADDCARD',
  'REMOVECARD',
  'IMBUECARD',
  'ADDTALENT',
  'REMOVETALENT',
]

function replaceCardIdsInNode(node, idToName, stats = { replaced: 0 }) {
  if (!node) return stats

  const replaceId = (str) => {
    if (!str || typeof str !== 'string') return str
    return str.replace(/\[cardid=(\d+)\]/g, (_m, id) => {
      const name = idToName[Number(id)]
      if (name) {
        stats.replaced++
        return `[cardid=${name}]`
      }
      return _m
    })
  }

  const replaceEffect = (effect) => {
    if (typeof effect !== 'string') return effect
    for (const cmd of CARD_ID_COMMANDS) {
      const re = new RegExp(`^(${cmd}):\\s*(\\d+)$`, 'i')
      const m = effect.match(re)
      if (m) {
        const name = idToName[Number(m[2])]
        if (name) {
          stats.replaced++
          return `${cmd}: ${name}`
        }
        break
      }
    }
    return effect
  }

  if (node.choiceLabel) node.choiceLabel = replaceId(node.choiceLabel)
  if (node.text) node.text = replaceId(node.text)
  if (node.effects && Array.isArray(node.effects)) {
    node.effects = node.effects.map(replaceEffect)
  }

  if (node.children) {
    node.children.forEach((child) => replaceCardIdsInNode(child, idToName, stats))
  }
  return stats
}


/**
 * Filter out nodes with 'default' text or choiceLabel for specific events
 * Removes the node and its entire subtree
 */
function filterDefaultNodes(node) {
  if (!node || !node.children) return

  const filteredChildren = []

  for (const child of node.children) {
    // Check if this child should be filtered
    const hasDefaultChoice = child.choiceLabel === 'default'
    const hasDefaultText = child.text === 'default'

    if (hasDefaultChoice || hasDefaultText) {
      // Skip this child and its entire subtree
      continue
    }

    // Recursively filter this child's children
    filterDefaultNodes(child)

    // Keep this child
    filteredChildren.push(child)
  }

  node.children = filteredChildren
}


module.exports = {
  checkInvalidRefs,
  replaceCardIdsInNode,
  filterDefaultNodes,
}
