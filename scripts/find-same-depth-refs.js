/* eslint-disable */
const fs = require('fs')
const path = require('path')

const EVENT_TREES_FILE = path.join(__dirname, '../src/codex/data/event-trees.json')

/**
 * Script to find nodes with refs pointing to other nodes at the same depth.
 * Also counts nodes with refChildren (converted sibling refs).
 * Reports:
 * - Event name
 * - Text or choice label of node with ref
 * - Whether it's pointing to a sibling or cousin
 * - Count of refChildren occurrences
 */

function analyzeEventTrees() {
  console.log('📖 Reading event trees file...\n')
  const eventTrees = JSON.parse(fs.readFileSync(EVENT_TREES_FILE, 'utf-8'))

  let totalSameLevelRefs = 0
  let totalRefChildren = 0
  let totalRefChildrenNodes = 0
  const results = []
  const refChildrenResults = []

  for (const tree of eventTrees) {
    if (tree.excluded || !tree.rootNode) continue

    const eventName = tree.name

    // Build a map of node ID to depth and parent
    const nodeDepthMap = new Map() // nodeId -> { depth, parent, node }

    function mapNodeDepths(node, depth = 0, parent = null) {
      nodeDepthMap.set(node.id, { depth, parent, node })

      if (node.children) {
        for (const child of node.children) {
          mapNodeDepths(child, depth + 1, node)
        }
      }
    }

    mapNodeDepths(tree.rootNode)

    // Find nodes with refs pointing to same-depth nodes
    for (const [nodeId, info] of nodeDepthMap) {
      const { depth, parent, node } = info

      if (node.ref !== undefined) {
        const targetInfo = nodeDepthMap.get(node.ref)

        if (!targetInfo) {
          // Invalid ref - skip
          continue
        }

        const targetDepth = targetInfo.depth
        const targetParent = targetInfo.parent

        if (depth === targetDepth) {
          // Same depth! Determine if sibling or cousin
          const isSibling = parent && targetParent && parent.id === targetParent.id
          const relationship = isSibling ? 'sibling' : 'cousin'

          // Get the text or choice label
          const label = node.choiceLabel || node.text || '(no text)'

          totalSameLevelRefs++

          results.push({
            eventName,
            nodeId,
            targetId: node.ref,
            label,
            relationship,
            depth,
          })
        }
      }

      // Count nodes with refChildren
      if (node.refChildren !== undefined && Array.isArray(node.refChildren)) {
        const label = node.choiceLabel || node.text || '(no text)'
        const numRefChildren = node.refChildren.length

        totalRefChildrenNodes++
        totalRefChildren += numRefChildren

        refChildrenResults.push({
          eventName,
          nodeId,
          label,
          numRefChildren,
          refChildrenIds: node.refChildren,
          depth,
        })
      }
    }
  }

  // Print results
  console.log(`Found ${totalSameLevelRefs} nodes with refs pointing to same-depth nodes\n`)

  if (results.length === 0) {
    console.log('No same-depth refs found.')
    return
  }

  // Group by event
  const byEvent = new Map()
  for (const result of results) {
    if (!byEvent.has(result.eventName)) {
      byEvent.set(result.eventName, [])
    }
    byEvent.get(result.eventName).push(result)
  }

  // Print grouped results
  for (const [eventName, refs] of byEvent) {
    console.log(`\n📍 Event: "${eventName}"`)
    console.log(`   Found ${refs.length} same-depth ref(s):\n`)

    for (const ref of refs) {
      console.log(`   Node ${ref.nodeId} -> ${ref.targetId}`)
      console.log(`   Label: "${ref.label}"`)
      console.log(`   Relationship: ${ref.relationship}`)
      console.log(`   Depth: ${ref.depth}`)
      console.log()
    }
  }

  // Print refChildren results
  if (refChildrenResults.length > 0) {
    console.log('\n' + '='.repeat(60))
    console.log('NODES WITH REFCHILDREN')
    console.log('='.repeat(60))

    const byEventRefChildren = new Map()
    for (const result of refChildrenResults) {
      if (!byEventRefChildren.has(result.eventName)) {
        byEventRefChildren.set(result.eventName, [])
      }
      byEventRefChildren.get(result.eventName).push(result)
    }

    for (const [eventName, refChildrenNodes] of byEventRefChildren) {
      console.log(`\n📍 Event: "${eventName}"`)
      console.log(`   Found ${refChildrenNodes.length} node(s) with refChildren:\n`)

      for (const node of refChildrenNodes) {
        console.log(`   Node ${node.nodeId}`)
        console.log(`   Label: "${node.label}"`)
        console.log(`   RefChildren count: ${node.numRefChildren}`)
        console.log(`   RefChildren IDs: [${node.refChildrenIds.join(', ')}]`)
        console.log(`   Depth: ${node.depth}`)
        console.log()
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total events with same-depth refs: ${byEvent.size}`)
  console.log(`Total same-depth refs: ${totalSameLevelRefs}`)

  const siblings = results.filter((r) => r.relationship === 'sibling').length
  const cousins = results.filter((r) => r.relationship === 'cousin').length

  console.log(`  - Sibling refs: ${siblings}`)
  console.log(`  - Cousin refs: ${cousins}`)

  console.log(`\nRefChildren conversions:`)
  console.log(`  - Nodes with refChildren: ${totalRefChildrenNodes}`)
  console.log(`  - Total refChildren references: ${totalRefChildren}`)
}

// Run the script
try {
  analyzeEventTrees()
} catch (error) {
  console.error('❌ Fatal error:', error)
  console.error(error.stack)
  process.exit(1)
}
