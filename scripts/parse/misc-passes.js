/**
 * Small standalone post-processing passes:
 * - checkInvalidRefs: report refs pointing to non-existent nodes (logging only)
 * - replaceCardIdsInNode: replace numeric card/talent IDs with names in text/labels/effects
 * - filterDefaultNodes: drop 'default' nodes (and their subtrees) for blacklisted events
 */

/** @typedef {import('./tree-utils.js').ParseNode} ParseNode */
const { CARD_ID_COMMANDS } = require('../shared/card-data.js')

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
    eventsWithInvalidRefs.forEach(({ name, examples }) => {
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

// Effect patterns for commands that take card/talent IDs as values
// (precompiled once - replaceEffect runs for every effect string in every tree)
const CARD_ID_EFFECT_PATTERNS = CARD_ID_COMMANDS.map((cmd) => ({
  cmd,
  re: new RegExp(`^(${cmd}):\\s*(\\d+)$`, 'i'),
}))

/**
 * @param {ParseNode} node
 * @param {Record<number, string>} idToName
 * @param {{ replaced: number }} [stats]
 */
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
    for (const { cmd, re } of CARD_ID_EFFECT_PATTERNS) {
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
 * @param {ParseNode} node
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

/**
 * Rewrite cost values the game engine reassigns at runtime, so the tree stops presenting
 * the story's `global decl` starting value as if it were a fixed price.
 *
 * Driven by ENGINE_ADJUSTED_COST_VARIABLES (event-overrides.js), which gives the variable's
 * real in-game escalation. For `enchantmentCost` ({ start: 100, step: 50 }) one variable
 * feeds four rendered sites, all rewritten here so they can't disagree with each other:
 *
 *   choiceLabel   "100 Gold: Imbue an Enchantment"  -> "<?> Gold: Imbue an Enchantment"
 *   requirements  "gold:100"                        -> "gold: <?> [100, 150, 200, ...]"
 *   effects       "GOLD: -100"                      -> "GOLD: -<?>"
 *   effects       "SET enchantmentCost = <newCost>" -> "SET enchantmentCost = <?>"
 *
 * The requirement carries the series because it's the one place with room to explain the
 * number; the rest just say `<?>` so no single figure reads as authoritative.
 *
 * The two nodes whose player-facing cost changed (the choice node and its outcome node) are
 * tagged `altered: true`, so the renderer's badge marks them as not-purely-parsed. The
 * dialogue node holding `SET <var> = <?>` is left untagged: it only tidies an internal
 * placeholder, and never showed the player a number in the first place.
 *
 * Scoping is the whole difficulty here, in two directions:
 *
 * - By VARIABLE, not by number. The events price several services at the same 100 gold from
 *   variables nothing reassigns (the Count's `copycost` "100 Gold: Copy a card."), and those
 *   are real fixed prices that must keep their number. Matching on "100" alone blanks them
 *   too. The `SET <var> = <placeholder>` rewrite is likewise pinned to the configured
 *   variable, so an unrelated unresolved assignment (`SET picks = <p>`) is left alone.
 * - By NODE. Choice separation splits the choice wrapper (label + requirements) from the
 *   outcome node (the `GOLD: -N` deduction), so the two halves are rewritten in different
 *   places and can't be matched together. `anchorsNode` re-links them: only a node that
 *   itself mentions the service, or whose parent choice label does, is eligible.
 *
 * `start` is what inkjs rendered (the declared default), so only that exact number is
 * rewritten. If upstream changes the default the pass stops matching rather than corrupting
 * a real value, and the caller's "0 rewrites" is the signal to re-check the config.
 */
function replaceEngineAdjustedCosts(node, costVariables, stats, parentAnchored = false) {
  if (!node) return

  Object.entries(costVariables).forEach(([variableName, { start, step, labelPattern }]) => {
    const series = `[${start}, ${start + step}, ${start + 2 * step}, etc...]`

    // Does this node belong to the service the cost variable prices? The label carries the
    // service name; the outcome node inherits eligibility from its parent choice wrapper.
    const labelMatches = node.choiceLabel?.includes(labelPattern) ?? false
    const anchorsNode = labelMatches || parentAnchored

    // Whether the cost this node shows the player was rewritten (see `altered` below)
    let rewroteCostForPlayer = false

    if (anchorsNode && node.choiceLabel) {
      // "100 Gold: ..." -> "<?> Gold: ..." (\b so a longer number like 1100 can't match)
      const updated = node.choiceLabel.replace(new RegExp(`\\b${start}(?= Gold:)`, 'g'), '<?>')
      if (updated !== node.choiceLabel) {
        node.choiceLabel = updated
        stats.rewritten++
        rewroteCostForPlayer = true
      }
    }

    if (anchorsNode && node.requirements) {
      node.requirements = node.requirements.map((requirement) => {
        const updated = requirement.replace(
          new RegExp(`^gold:\\s*${start}$`),
          `gold: <?> ${series}`
        )
        if (updated !== requirement) {
          stats.rewritten++
          rewroteCostForPlayer = true
        }
        return updated
      })
    }

    if (node.effects) {
      node.effects = node.effects.map((effect) => {
        // The unresolved assignment placeholder is keyed by variable name, so it applies
        // wherever it appears; the gold deduction needs the service anchor.
        let updated = effect.replace(new RegExp(`^(SET ${variableName} = )<\\w+>$`), '$1<?>')
        if (updated !== effect) stats.rewritten++

        if (anchorsNode) {
          const withCost = updated.replace(new RegExp(`^GOLD:\\s*-${start}$`), 'GOLD: -<?>')
          if (withCost !== updated) {
            stats.rewritten++
            rewroteCostForPlayer = true
            updated = withCost
          }
        }
        return updated
      })
    }

    // Tag the nodes whose displayed COST we replaced — the choice node and its outcome node
    // — so the renderer's "altered content" badge flags them as not-purely-parsed, the same
    // as manual event alterations. Deliberately not tagged on the dialogue node carrying
    // `SET <var> = <?>`: that only tidies an internal placeholder the player never had a
    // number for, so there is nothing there to warn a reader about.
    if (rewroteCostForPlayer) {
      node.altered = true
    }

    ;(node.children || []).forEach((child) =>
      replaceEngineAdjustedCosts(
        child,
        { [variableName]: { start, step, labelPattern } },
        stats,
        anchorsNode
      )
    )
  })
}

module.exports = {
  checkInvalidRefs,
  replaceCardIdsInNode,
  filterDefaultNodes,
  replaceEngineAdjustedCosts,
}
