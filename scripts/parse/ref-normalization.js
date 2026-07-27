/**
 * Post-processing passes that rewrite refs to point at the "right" node after
 * structural passes (choice separation, combat splitting) have moved content around:
 * - normalizeRefsPointingToChoiceNodes: refs should target outcome nodes, not choice wrappers
 * - normalizeRefsPointingToCombatNodes: refs should target postcombat dialogue, not split combat nodes
 * - promoteShallowDialogueMenuHub: make the shallowest hub copy canonical and rewrite refs to it
 */
const { OPTIMIZATION_PASS_CONFIG } = require('./configs.js')
const { debugConfig } = require('./debug.js')
const { buildNodeMapForTree } = require('./tree-utils.js')

/**
 * Normalize refs so they never target a choice wrapper node.
 *
 * After separateChoicesFromEffects(), many "hub" refs (and potentially other refs)
 * can end up pointing at the choice wrapper (type: 'choice') rather than the outcome
 * node that contains the hub's text/effects.
 *
 * Rule:
 * - A choice node's ref can intentionally point at another choice node. Do NOT rewrite
 *   refs on nodes where node.type === 'choice'.
 * - For any NON-choice node: if node.ref points to a node with type === 'choice', rewrite
 *   it to point to that choice node's ONLY child (the outcome node).
 * - If a choice node has 0 or >1 children, log a warning and do not rewrite.
 */
function normalizeRefsPointingToChoiceNodes(eventTrees) {
  let totalRewrites = 0
  const eventsWithRewrites = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) return

    const nodeMap = buildNodeMapForTree(tree.rootNode)
    let rewritesForEvent = 0

    function visit(node) {
      if (!node) return

      // A choice node's ref can intentionally point at another choice node.
      // We only normalize refs for non-choice nodes.
      if (node.ref !== undefined && node.type !== 'choice') {
        let targetId = node.ref
        let targetNode = nodeMap.get(targetId)

        // Follow choice wrappers (should be a single hop, but keep it safe)
        let hops = 0
        while (targetNode && targetNode.type === 'choice') {
          const children = targetNode.children || []
          if (children.length !== 1) {
            console.warn(
              `  ⚠️  Event "${tree.name}": ref ${node.id} -> ${targetId} targets a choice node with ${children.length} children`
            )
            break
          }

          const outcomeId = children[0].id
          node.ref = outcomeId
          rewritesForEvent++
          targetId = outcomeId
          targetNode = nodeMap.get(targetId)

          hops++
          if (hops > 10) {
            console.warn(
              `  ⚠️  Event "${tree.name}": ref normalization exceeded hop limit from node ${node.id}`
            )
            break
          }
        }
      }

      if (node.children) {
        node.children.forEach((child) => visit(child))
      }
    }

    visit(tree.rootNode)

    if (rewritesForEvent > 0) {
      totalRewrites += rewritesForEvent
      eventsWithRewrites.push({ name: tree.name, rewrites: rewritesForEvent })
    }
  })

  return { totalRewrites, eventsWithRewrites }
}

/**
 * Normalize refs so they never target a combat node that has been split into combat + postcombat.
 *
 * After postcombat/aftercombat separation in buildTreeFromStory(), combat nodes may be split into:
 * 1. Combat node (type: 'combat') - contains pre-combat text and COMBAT effect
 * 2. Postcombat dialogue node (type: 'dialogue') - contains postcombat text, effects, and choices
 *
 * Problem: During tree building, menu hub detection may mark the combat node as a hub (before splitting).
 * When the hub's children are built, they create refs back to the combat node. But after splitting,
 * these refs should point to the postcombat dialogue child instead, since that's where the hub text
 * and choices actually live.
 *
 * This function finds all refs pointing to split combat nodes and redirects them to the postcombat
 * dialogue child. Exception: combat nodes referencing another combat node are left unchanged, since
 * a combat-to-combat ref should stay anchored to the combat node itself.
 *
 * Example:
 *   BEFORE normalization:
 *     Combat Node (id=100)
 *       └─ Postcombat Dialogue Node (id=101, text="hub dialogue", children=[...])
 *     Some Other Node (ref=100)  // ❌ Points to combat node
 *     Combat Node   (ref=100)    // ✅ Already correct — combat → combat ref stays as-is
 *
 *   AFTER normalization:
 *     Combat Node (id=100)
 *       └─ Postcombat Dialogue Node (id=101, text="hub dialogue", children=[...])
 *     Some Other Node (ref=101)  // ✅ Points to postcombat dialogue node
 *     Combat Node   (ref=100)    // ✅ Still points to the combat node
 */
function normalizeRefsPointingToCombatNodes(eventTrees) {
  let totalRewrites = 0
  const eventsWithRewrites = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) return

    const eventName = tree.name
    const nodeMap = buildNodeMapForTree(tree.rootNode)
    let rewritesForEvent = 0

    // First pass: Build a map of combat nodes that have been split
    // combat node ID -> postcombat dialogue child ID
    const combatNodeToPostcombatChild = new Map()

    nodeMap.forEach((node) => {
      // A split combat node has:
      // - type: 'combat'
      // - exactly 1 child
      // - that child is type: 'dialogue'
      if (
        node.type === 'combat' &&
        node.children &&
        node.children.length === 1 &&
        node.children[0].type === 'dialogue'
      ) {
        combatNodeToPostcombatChild.set(node.id, node.children[0].id)
      }
    })

    // Second pass: Rewrite refs pointing to split combat nodes
    function visit(node) {
      if (!node) return

      // If this node has a ref pointing to a split combat node, redirect it to the postcombat child.
      // Exception: combat nodes referencing another combat node should keep pointing to the combat
      // node, not its postcombat dialogue child.
      if (
        node.ref !== undefined &&
        node.type !== 'combat' &&
        combatNodeToPostcombatChild.has(node.ref)
      ) {
        const oldRef = node.ref
        const newRef = combatNodeToPostcombatChild.get(oldRef)
        node.ref = newRef
        rewritesForEvent++

        if (eventName === debugConfig.eventName) {
          console.log(
            `  🔧 Normalized ref: node ${node.id} (type=${node.type}) changed from combat ${oldRef} -> postcombat dialogue ${newRef}`
          )
        }
      }

      if (node.children) {
        node.children.forEach((child) => visit(child))
      }
    }

    visit(tree.rootNode)

    if (rewritesForEvent > 0) {
      totalRewrites += rewritesForEvent
      eventsWithRewrites.push({ name: tree.name, rewrites: rewritesForEvent })
    }
  })

  return { totalRewrites, eventsWithRewrites }
}

function promoteShallowDialogueMenuHub(eventTrees) {
  // For dialogue-menu events using threshold mode, we may end up with:
  // - a deep "hub" node that owns the menu children
  // - one or more shallower duplicates that are refs to that deep hub
  //
  // Why the deep hub "wins" pre-promotion:
  // - We assign the hub snapshot during tree building (early).
  // - But for many events, the shallowest hub-text copy isn't "available" as a standalone node
  //   until after `separateChoicesFromEffects()` runs, because that pass creates additional
  //   outcome nodes (with text) under choice wrappers.
  // - That means the earliest *reachable* hub-with-children can be deeper, and other hub-text
  //   copies become refs to it. This pass flips that so the shallowest copy becomes canonical.
  // EXAMPLE: `Statue of Ilthar II Death`
  //
  // This pass promotes the shallowest ref-copy to become the hub (by moving children),
  // then rewrites refs that used to target the old hub to target the new hub.
  eventTrees.forEach((tree) => {
    const eventName = tree.name
    const cfg = OPTIMIZATION_PASS_CONFIG.DIALOGUE_MENU_EVENTS[eventName]
    if (!cfg?.hubChoiceMatchThreshold) return
    if (!tree.rootNode) return

    const nodesById = new Map()
    const metaById = new Map() // id -> { depth, parentId }
    const queue = [{ node: tree.rootNode, depth: 0, parentId: null }]
    while (queue.length > 0) {
      const { node, depth, parentId } = queue.shift()
      if (!node || node.id === undefined) continue
      nodesById.set(node.id, node)
      metaById.set(node.id, { depth, parentId })
      if (node.children) {
        node.children.forEach((child) =>
          queue.push({ node: child, depth: depth + 1, parentId: node.id })
        )
      }
    }

    const hubTextNodes = []
    nodesById.forEach((node) => {
      if (typeof node.text === 'string' && node.text.includes(cfg.menuHubPattern)) {
        hubTextNodes.push(node)
      }
    })
    if (hubTextNodes.length === 0) return

    const hubWithChildren = hubTextNodes
      .filter((n) => n.ref === undefined && n.children && n.children.length > 0)
      .sort((a, b) => metaById.get(a.id).depth - metaById.get(b.id).depth)[0]
    if (!hubWithChildren) return

    // Find shallow nodes with refs (to ANY node, including choice wrappers from inline detection)
    // The inline hub detection may have created refs to a choice wrapper (e.g., node 2 in Frozen Heart),
    // and after separateChoicesFromEffects, the actual hub text ended up deeper (e.g., node 16522).
    // We want to find ANY hub text node that has a ref, regardless of what it points to.
    const shallowRefToHub = hubTextNodes
      .filter((n) => n.ref !== undefined)
      .sort((a, b) => metaById.get(a.id).depth - metaById.get(b.id).depth)[0]
    if (!shallowRefToHub) return

    const hubDepth = metaById.get(hubWithChildren.id).depth
    const refDepth = metaById.get(shallowRefToHub.id).depth
    if (refDepth >= hubDepth) return

    const oldHubId = hubWithChildren.id
    const newHubId = shallowRefToHub.id

    // Promote: new hub gets old hub's children and becomes non-ref
    shallowRefToHub.children = hubWithChildren.children
    delete shallowRefToHub.ref

    // Demote: old hub becomes a ref to the new hub and drops its children
    hubWithChildren.ref = newHubId
    delete hubWithChildren.children

    // Collect all ref targets from hub text nodes (to handle refs to choice wrappers like node 2)
    const allRefTargets = new Set()
    allRefTargets.add(oldHubId) // Include the old hub-with-children
    hubTextNodes.forEach((n) => {
      if (n.ref !== undefined) {
        allRefTargets.add(n.ref) // Include any nodes that hub text nodes reference
      }
    })

    // Rewrite: anything that referenced the old hub or any ref target should now reference the new (shallowest) hub
    // This includes refs to the old hub-with-children AND refs to choice wrappers (from inline detection)
    nodesById.forEach((node) => {
      if (node.ref !== undefined && allRefTargets.has(node.ref)) {
        node.ref = newHubId
      }
    })

    // Also update any hub text nodes that had refs - they should all point to the new hub now
    hubTextNodes.forEach((node) => {
      if (node.id !== newHubId && node.ref !== undefined) {
        // This hub text node has a ref - update it to point to the new hub
        node.ref = newHubId
      }
    })

    if (eventName === debugConfig.eventName) {
      console.log(
        `  🧭 Promoted hub for "${eventName}": ${oldHubId}@depth${hubDepth} -> ${newHubId}@depth${refDepth}`
      )
    }
  })
}

module.exports = {
  normalizeRefsPointingToChoiceNodes,
  normalizeRefsPointingToCombatNodes,
  promoteShallowDialogueMenuHub,
}
