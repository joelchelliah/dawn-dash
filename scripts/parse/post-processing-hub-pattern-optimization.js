/* eslint-disable */

/**
 * Auto-detection of dialogue menu hub patterns via post-processing
 *
 * Phase 1: Hub Candidate Detection
 * - Identifies nodes that appear to be dialogue menu hubs
 * - Logs all detected candidates for validation
 *
 * See: scripts/optimizationIdeas/auto-detect-dialogue-menu-hubs.md
 */

const { OPTIMIZATION_PASS_CONFIG } = require('./configs.js')

/**
 * Extract choice labels from a node's children
 */
function getChoiceLabels(node) {
  if (!node.children) return []
  return node.children.filter((c) => c.choiceLabel).map((c) => c.choiceLabel)
}

/**
 * Check if choiceSet2 is a subset of choiceSet1 with same or 1 fewer choices
 * This detects hub return patterns where the return node has:
 * - Same choices as hub (all questions available again)
 * - Same choices minus 1 (one question removed, typically the exit)
 */
function isSubsetWithSameOrOneLess(choiceSet1, choiceSet2) {
  if (choiceSet2.length > choiceSet1.length) return false
  if (choiceSet2.length < choiceSet1.length - 1) return false

  // Check if all choices in set2 appear in set1
  const set1 = new Set(choiceSet1)
  return choiceSet2.every((choice) => set1.has(choice))
}

/**
 * Detect and optimize dialogue menu hub patterns
 *
 * Phase 1 (Detection): Find all hub patterns via BFS traversal
 * Phase 2 (Optimization): Create refs for whitelisted events
 *
 * Uses BFS traversal to detect hub patterns:
 * 1. When we encounter a node with >= MIN_CHOICES, mark it as potential hub
 * 2. For each subsequent node, check if its choices are a subset (same or -1) of any potential hub
 * 3. If match found, confirm the hub
 * 4. For whitelisted events: replace duplicate hubs with refs to canonical (shallowest) hub
 */
function detectAndOptimizeDialogueMenuHubs(eventTrees, DEBUG_EVENT_NAME = '') {
  if (!OPTIMIZATION_PASS_CONFIG.POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED) {
    return { totalHubsDetected: 0, totalRefsCreated: 0, eventsWithOptimization: [] }
  }

  console.log('\n🔍 Detecting dialogue menu hub patterns')

  const MIN_CHOICES = OPTIMIZATION_PASS_CONFIG.POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_CHOICES
  const BLACKLIST =
    OPTIMIZATION_PASS_CONFIG.POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST || []

  let totalHubCandidates = 0
  let totalRefsCreated = 0
  const eventsWithCandidates = []
  const eventsWithOptimization = []

  eventTrees.forEach((tree) => {
    const eventName = tree.name
    if (!tree.rootNode) return

    const isEnabled = !BLACKLIST.includes(eventName)

    // BFS traversal to detect hubs (with depth tracking)
    const potentialHubs = [] // { node, choiceSet, depth }
    const confirmedHubs = new Map() // nodeId -> { node, choiceSet, matchingNodes, depth }

    const queue = [{ node: tree.rootNode, depth: 0 }]
    let nodesProcessed = 0

    while (queue.length > 0) {
      nodesProcessed++
      const { node, depth } = queue.shift()

      if (!node) continue
      // Skip nodes that already have refs (they're already optimized)
      if (node.ref !== undefined) continue

      // Check if this node qualifies for consideration
      if (node.type === 'dialogue' && node.text && node.ref === undefined) {
        const choiceSet = getChoiceLabels(node)

        // Add nodes with MIN_CHOICES or more as potential hubs
        if (choiceSet.length >= MIN_CHOICES) {
          potentialHubs.push({ node, choiceSet, depth })
        }

        // Check if this node (regardless of choice count) matches any existing potential hubs
        if (choiceSet.length > 0) {
          for (const hub of potentialHubs) {
            if (hub.node.id === node.id) continue

            // Check if current node's choices are subset of hub's choices
            if (isSubsetWithSameOrOneLess(hub.choiceSet, choiceSet)) {
              // Confirm the hub
              if (!confirmedHubs.has(hub.node.id)) {
                confirmedHubs.set(hub.node.id, {
                  node: hub.node,
                  choiceSet: hub.choiceSet,
                  depth: hub.depth,
                  matchingNodes: [],
                })
              }
              confirmedHubs.get(hub.node.id).matchingNodes.push({ node, depth })
            }
          }
        }
      }

      // Add children to queue with incremented depth
      if (node.children) {
        node.children.forEach((child) => {
          queue.push({ node: child, depth: depth + 1 })
        })
      }
    }

    // Phase 1 Complete: Group hubs by identical choice sets
    if (confirmedHubs.size === 0) return

    // Group hubs by choice signature and track depths
    const hubsByChoiceSignature = new Map() // choiceSignature -> { nodesWithDepth: [], choiceSet }

    confirmedHubs.forEach(({ node, choiceSet, depth, matchingNodes }) => {
      const choiceSignature = JSON.stringify([...choiceSet].sort())

      // Collect all nodes in this hub group with their depths
      const allNodesInGroup = [
        { node, depth },
        ...matchingNodes, // matchingNodes already has { node, depth }
      ]

      if (!hubsByChoiceSignature.has(choiceSignature)) {
        hubsByChoiceSignature.set(choiceSignature, {
          nodesWithDepth: allNodesInGroup,
          choiceSet,
        })
      } else {
        // Add all nodes to the existing group
        const group = hubsByChoiceSignature.get(choiceSignature)
        group.nodesWithDepth.push(...allNodesInGroup)
      }
    })

    // Phase 2: For non-blacklisted events, create refs to canonical hub
    let refsCreatedForEvent = 0

    if (isEnabled) {
      hubsByChoiceSignature.forEach(({ nodesWithDepth }) => {
        if (nodesWithDepth.length < 2) return // Need at least 2 nodes to optimize

        // Sort to find canonical hub: shallowest, then most children, then leftmost (first in BFS)
        const sortedNodes = [...nodesWithDepth].sort((a, b) => {
          // 1. Shallowest depth wins
          if (a.depth !== b.depth) return a.depth - b.depth

          // 2. Most children wins
          const aChildCount = a.node.children?.length || 0
          const bChildCount = b.node.children?.length || 0
          if (aChildCount !== bChildCount) return bChildCount - aChildCount

          // 3. Leftmost (first in BFS order, lower node ID)
          return a.node.id - b.node.id
        })

        // First node is canonical, rest become refs
        const canonicalHub = sortedNodes[0]
        const nodesToReplace = sortedNodes.slice(1)

        // Replace duplicates with refs
        nodesToReplace.forEach(({ node }) => {
          // Remove children and create ref
          delete node.children
          node.ref = canonicalHub.node.id
          refsCreatedForEvent++
        })
      })

      // Phase 3: Resolve transitive refs (refs pointing to nodes that are now refs themselves)
      // This fixes cases where node A → B → C, ensuring A points directly to C
      const resolveTransitiveRefs = (node, visited = new Set()) => {
        if (!node || visited.has(node.id)) return
        visited.add(node.id)

        if (node.ref !== undefined) {
          // Find the target node to check if it's also a ref
          const findNodeById = (id) => {
            const queue = [tree.rootNode]
            while (queue.length > 0) {
              const current = queue.shift()
              if (!current) continue
              if (current.id === id) return current
              if (current.children) queue.push(...current.children)
            }
            return null
          }

          const targetNode = findNodeById(node.ref)
          if (targetNode && targetNode.ref !== undefined) {
            // Target is also a ref, follow the chain to the final target
            let finalTarget = targetNode
            const chainVisited = new Set()
            while (finalTarget.ref !== undefined && !chainVisited.has(finalTarget.id)) {
              chainVisited.add(finalTarget.id)
              const nextTarget = findNodeById(finalTarget.ref)
              if (!nextTarget) break
              finalTarget = nextTarget
            }
            // Update this node to point directly to the final target
            node.ref = finalTarget.id
          }
        }

        // Recursively process children
        if (node.children) {
          node.children.forEach((child) => resolveTransitiveRefs(child, visited))
        }
      }

      resolveTransitiveRefs(tree.rootNode)

      totalRefsCreated += refsCreatedForEvent

      if (refsCreatedForEvent > 0) {
        eventsWithOptimization.push({
          name: eventName,
          refsCreated: refsCreatedForEvent,
          hubPatterns: hubsByChoiceSignature.size,
        })
      }
    }

    // Phase 1 Reporting: Only log blacklisted events (for discovery of potential false positives)
    if (!isEnabled) {
      let candidatesForEvent = 0
      const candidateDetails = []

      hubsByChoiceSignature.forEach(({ nodesWithDepth, choiceSet }) => {
        candidatesForEvent++
        totalHubCandidates++

        // Use shallowest node as representative for reporting
        const representativeNode = nodesWithDepth.reduce((shallowest, current) =>
          current.depth < shallowest.depth ? current : shallowest
        ).node

        const textPreview = representativeNode.text.substring(0, 30)
        const choiceLabels = choiceSet.map((c) => c.substring(0, 30)).slice(0, 3)

        candidateDetails.push({
          nodeId: representativeNode.id,
          textPreview,
          choiceLabels,
          duplicateCount: nodesWithDepth.length,
          childCount: representativeNode.children?.length || 0,
        })

        // Log details for debug event
        if (eventName === DEBUG_EVENT_NAME) {
          console.log(`  🎯 Hub candidate at node ${representativeNode.id}:`)
          console.log(
            `      Text: "${textPreview}${representativeNode.text.length > 30 ? '...' : ''}"`
          )
          console.log(
            `      Total instances: ${nodesWithDepth.length} nodes with identical choices`
          )
          console.log(`      Children: ${representativeNode.children?.length || 0}`)
          console.log(
            `      Choices: [${choiceLabels.join(', ')}${choiceSet.length > 3 ? ', ...' : ''}]`
          )
          console.log(`      Node IDs: [${nodesWithDepth.map((n) => n.node.id).join(', ')}]`)
        }
      })

      if (candidatesForEvent > 0) {
        eventsWithCandidates.push({
          name: eventName,
          candidates: candidatesForEvent,
          details: candidateDetails,
        })
      }
    }
  })

  // Summary logging
  if (totalRefsCreated > 0) {
    console.log(
      `  ✅ Optimized ${eventsWithOptimization.length} event(s), created ${totalRefsCreated} refs`
    )
    eventsWithOptimization.forEach(({ name, refsCreated, hubPatterns }) => {
      console.log(`    - "${name}": ${refsCreated} refs created (${hubPatterns} hub pattern(s))`)
    })
  }

  if (eventsWithCandidates.length > 0) {
    console.log(
      `\n  📋 Discovered ${totalHubCandidates} hub candidate(s) in ${eventsWithCandidates.length} blacklisted event(s):`
    )
    eventsWithCandidates.forEach(({ name, candidates, details }) => {
      console.log(`    - "${name}": ${candidates} candidate(s)`)
      details.forEach(({ nodeId, textPreview, duplicateCount, childCount }) => {
        console.log(
          `        Node ${nodeId}: "${textPreview}..." (${duplicateCount} matching nodes, ${childCount} children)`
        )
      })
    })
  }

  return {
    totalHubsDetected: totalHubCandidates,
    totalRefsCreated,
    eventsWithOptimization,
  }
}

module.exports = {
  detectAndOptimizeDialogueMenuHubs,
}
