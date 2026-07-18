/* eslint-disable */
/**
 * Structural subtree deduplication (post-processing).
 *
 * Replaces structurally identical subtrees with refs, preferring shallow originals.
 * Runs AFTER the semantic hub-optimization passes so dialogue-menu patterns are
 * handled semantically first, then structural dedup cleans up remaining duplicates.
 */
const { OPTIMIZATION_PASS_CONFIG, RANDOM_KEYWORD } = require('./configs.js')
const { countNodes, getDescendantCountAtDepth } = require('./tree-utils.js')

/**
 * Check if two subtrees are structurally identical
 *
 * Compares:
 * - Number of children
 * - For each child: text, choiceLabel, type, requirements, effects
 * - For each child: descendant counts at configured depth levels (to catch structural differences)
 *
 * The depth of comparison is controlled by DEDUPLICATE_SUBTREES_SIGNATURE_DEPTH.
 */
function areSubtreesIdentical(nodeA, nodeB) {
  // Must have same number of children
  const childrenA = nodeA.children || []
  const childrenB = nodeB.children || []

  if (childrenA.length !== childrenB.length) return false

  // If both have no children, they're identical (both leaf nodes)
  if (childrenA.length === 0) return true

  const signatureDepth = OPTIMIZATION_PASS_CONFIG.DEDUPLICATE_SUBTREES_SIGNATURE_DEPTH || 2

  // Check each child
  for (let i = 0; i < childrenA.length; i++) {
    const childA = childrenA[i]
    const childB = childrenB[i]

    // Compare text
    if (childA.text !== childB.text) return false

    // Compare choiceLabel
    if (childA.choiceLabel !== childB.choiceLabel) return false

    // Compare requirements (exact match)
    const reqA = JSON.stringify(childA.requirements || null)
    const reqB = JSON.stringify(childB.requirements || null)
    if (reqA !== reqB) return false

    // Compare effects (exact match)
    const effA = JSON.stringify(childA.effects || null)
    const effB = JSON.stringify(childB.effects || null)
    if (effA !== effB) return false

    // Compare descendant counts at each depth level (1 to signatureDepth)
    for (let depth = 1; depth <= signatureDepth; depth++) {
      const countA = getDescendantCountAtDepth(childA, depth)
      const countB = getDescendantCountAtDepth(childB, depth)
      if (countA !== countB) return false
    }
  }

  return true
}

/**
 * Deduplicate structurally identical subtrees within a single event tree
 *
 * Uses breadth-first traversal to process nodes from shallowest to deepest.
 * This ensures the shallowest occurrence becomes the original (better for visualization).
 *
 * Only deduplicates subtrees with at least 3 nodes to avoid unnecessary overhead.
 * Creates a structural signature based on children's text, type, requirements, and effects.
 * Replaces duplicate subtrees with ref nodes pointing to the first occurrence.
 */
function deduplicateEventTree(rootNode) {
  const subtreeMap = new Map() // signature -> first occurrence node id
  let duplicatesFound = 0
  let nodesRemoved = 0

  // Breadth-first traversal to process nodes from shallowest to deepest
  const queue = [rootNode]
  const allNodes = []
  const nodesById = new Map()

  while (queue.length > 0) {
    const node = queue.shift()
    if (!node) continue

    allNodes.push(node)
    if (node.id !== undefined) {
      nodesById.set(node.id, node)
    }

    if (node.children) {
      queue.push(...node.children)
    }
  }

  // Narrow safety guard:
  // Avoid deduping a subtree if doing so would prune away a node that is referenced by a ref
  // from OUTSIDE that subtree. (Refs from inside the subtree would be deleted too, so they
  // don't count as "must stay reachable" for this specific prune.)
  //
  // This is much less invasive than "protect all ancestors of all ref targets" and avoids
  // broad side effects in other events.
  const referrersByTargetId = new Map() // targetId -> Array<referrerId>
  for (const node of allNodes) {
    if (node?.id !== undefined && node.ref !== undefined) {
      const arr = referrersByTargetId.get(node.ref) || []
      arr.push(node.id)
      referrersByTargetId.set(node.ref, arr)
    }
  }

  // Precompute subtree membership via DFS entry/exit times.
  const tin = new Map()
  const tout = new Map()
  let time = 0
  const stack = [{ node: rootNode, state: 0 }]
  while (stack.length > 0) {
    const top = stack.pop()
    const node = top.node
    if (!node || node.id === undefined) continue
    if (top.state === 0) {
      tin.set(node.id, time++)
      stack.push({ node, state: 1 })
      const children = node.children || []
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], state: 0 })
      }
    } else {
      tout.set(node.id, time - 1)
    }
  }

  const refTargetsSortedByTin = Array.from(referrersByTargetId.keys())
    .filter((id) => tin.has(id))
    .sort((a, b) => tin.get(a) - tin.get(b))

  function lowerBoundTargetsByTin(minTin) {
    let lo = 0
    let hi = refTargetsSortedByTin.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      const id = refTargetsSortedByTin[mid]
      if (tin.get(id) < minTin) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  function subtreeWouldPruneExternalRefTarget(candidateNode) {
    const candId = candidateNode.id
    const start = tin.get(candId)
    const end = tout.get(candId)
    if (start === undefined || end === undefined) return false

    const startIdx = lowerBoundTargetsByTin(start)
    for (let i = startIdx; i < refTargetsSortedByTin.length; i++) {
      const targetId = refTargetsSortedByTin[i]
      const tTin = tin.get(targetId)
      if (tTin === undefined || tTin > end) break

      // targetId is inside candidate subtree. If any referrer is outside, pruning breaks it.
      const referrers = referrersByTargetId.get(targetId) || []
      for (const referrerId of referrers) {
        const rTin = tin.get(referrerId)
        if (rTin === undefined) continue
        if (rTin < start || rTin > end) {
          return true
        }
      }
    }

    return false
  }

  // Process nodes in breadth-first order (shallowest first)
  for (const node of allNodes) {
    if (!node.children || node.children.length === 0) continue
    // NOTE: ref can be 0, so don't use truthy checks here.
    if (node.ref !== undefined) continue // Skip nodes that are already references

    // Check if this subtree is large enough to deduplicate
    const subtreeSize = countNodes(node)
    if (subtreeSize >= OPTIMIZATION_PASS_CONFIG.DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE) {
      // Create a simple signature based on node structure
      const signatureDepth = OPTIMIZATION_PASS_CONFIG.DEDUPLICATE_SUBTREES_SIGNATURE_DEPTH || 2
      const signature = JSON.stringify({
        parentText: node.text,
        parentChoiceLabel: node.choiceLabel,
        parentType: node.type,
        numChildren: node.children.length,
        childrenData: node.children.map((child) => {
          const childData = {
            text: child.text,
            choiceLabel: child.choiceLabel,
            type: child.type,
            requirements: child.requirements,
            effects: child.effects,
            ref: child.ref, // Include ref in signature to avoid merging nodes with different refs
          }
          // Include descendant counts at each depth level to prevent false matches
          for (let depth = 1; depth <= signatureDepth; depth++) {
            childData[`descendantsAtDepth${depth}`] = getDescendantCountAtDepth(child, depth)
          }
          return childData
        }),
      })

      // Check if we've seen this signature before
      if (subtreeMap.has(signature)) {
        const originalNodeId = subtreeMap.get(signature)
        const originalNode = nodesById.get(originalNodeId)

        // Deep check: are the subtrees truly identical?
        if (originalNode && areSubtreesIdentical(node, originalNode)) {
          // Don't collapse nodes whose text contains RANDOM_KEYWORD (distinct branches that only differ by the random value)
          if (node.text && node.text.includes(RANDOM_KEYWORD)) {
            continue
          }
          // Don't prune away externally-referenced ref targets.
          if (subtreeWouldPruneExternalRefTarget(node)) {
            continue
          }

          // Mark this node as a reference to the original
          node.ref = originalNodeId
          const removedNodes = subtreeSize - 1 // -1 because we keep the reference node
          nodesRemoved += removedNodes
          duplicatesFound++

          // Remove children (they're in the referenced node)
          delete node.children
        }
      } else {
        // First occurrence of this subtree - store it
        subtreeMap.set(signature, node.id)
      }
    }
  }

  return { duplicatesFound, nodesRemoved }
}


/**
 * Post-processing: Deduplicate structurally identical subtrees across all event trees
 * This catches remaining duplicates that weren't detected during tree building
 */
function deduplicateAllTrees(eventTrees, maxIterations = 1) {
  const iterations = Math.max(0, maxIterations)
  let totalDuplicates = 0
  let totalNodesRemoved = 0
  let iterationsRun = 0

  // Track (aggregate) which events were deduped across all iterations.
  const eventStats = new Map() // name -> { duplicates, nodesRemoved }

  for (let iter = 0; iter < iterations; iter++) {
    let duplicatesThisPass = 0
    let nodesRemovedThisPass = 0

    eventTrees.forEach((tree) => {
      if (!tree.rootNode) return
      if (OPTIMIZATION_PASS_CONFIG.DEDUPLICATE_SUBTREES_EVENT_BLACKLIST?.includes(tree.name)) return

      const { duplicatesFound, nodesRemoved } = deduplicateEventTree(tree.rootNode)
      if (duplicatesFound <= 0) return

      duplicatesThisPass += duplicatesFound
      nodesRemovedThisPass += nodesRemoved

      const prev = eventStats.get(tree.name) || { duplicates: 0, nodesRemoved: 0 }
      prev.duplicates += duplicatesFound
      prev.nodesRemoved += nodesRemoved
      eventStats.set(tree.name, prev)
    })

    iterationsRun++
    totalDuplicates += duplicatesThisPass
    totalNodesRemoved += nodesRemovedThisPass

    if (nodesRemovedThisPass === 0) {
      break
    }
  }

  const eventsWithDedupe = Array.from(eventStats.entries()).map(([name, stats]) => ({
    name,
    duplicates: stats.duplicates,
    nodesRemoved: stats.nodesRemoved,
  }))

  return { totalDuplicates, totalNodesRemoved, eventsWithDedupe, iterationsRun }
}

module.exports = {
  deduplicateAllTrees,
}
