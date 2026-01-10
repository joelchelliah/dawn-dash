/* eslint-disable */
const fs = require('fs')
const path = require('path')
const { Story } = require('inkjs')

// Suppress inkjs version warnings (our events are v21, inkjs supports v20 but works fine)
const originalWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes('Version of ink')) return
  originalWarn.apply(console, args)
}

/**
 * Script to parse Ink JSON from events and generate hierarchical tree structures
 * using the official inkjs runtime for accurate parsing.
 *
 * REPEATABLE NODE LOGIC:
 * ----------------------
 * When a choice or dialogue appears multiple times in a tree (creating a loop),
 * we mark it as "repeatable" and use "repeatFrom" to track where it loops back to.
 *
 * The pattern after processing is:
 * - CHILD nodes get: repeatable: true (no repeatFrom)
 * - PARENT node gets: repeatFrom: <ancestor_node_id>
 *
 * Example structure:
 *   Node 3: { choiceLabel: "Continue" }
 *     └─ Node 2139: { repeatFrom: 3 }  ← Parent has repeatFrom pointing to ancestor
 *         ├─ Node 4: { choiceLabel: "Continue", repeatable: true }  ← Child has repeatable
 *         ├─ Node 5: { choiceLabel: "Continue", repeatable: true }
 *         └─ Node 6: { choiceLabel: "Continue", repeatable: true }
 *
 * This allows the UI to:
 * - Identify repeatable choices by the "repeatable: true" flag on children
 * - Draw links from parent's "repeatFrom" back to the ancestor node
 *
 * INCORRECT patterns to watch for:
 * - Child with BOTH repeatable AND repeatFrom (should never happen after moveRepeatFromToParent)
 * - Parent missing repeatFrom when children have repeatable: true (indicates bug in logic)
 */

const EVENTS_FILE = path.join(__dirname, './events.json')
const OUTPUT_FILE = path.join(__dirname, '../src/codex/data/event-trees.json')

let nodeIdCounter = 0
let totalNodesInCurrentEvent = 0
const MAX_NODES_PER_EVENT = 500 // Limit nodes per event to prevent runaway exploration

/**
 * Generate a unique node ID (integer, unique per event)
 */
function generateNodeId() {
  return nodeIdCounter++
}

/**
 * Detect random value assignments in Ink JSON
 * Returns a map of variable names to their random ranges: { varName: { min, max } }
 */
function detectRandomVariables(inkJsonString) {
  const randomVars = new Map()

  try {
    const inkJson = JSON.parse(inkJsonString)

    // Recursive function to traverse the Ink JSON structure
    function traverse(node) {
      if (Array.isArray(node)) {
        // Look for pattern: ["ev", minValue, maxValue, "rnd", "/ev", {"VAR=": "varName", ...}]
        // This represents: VAR = random(min, max)
        for (let i = 0; i < node.length - 3; i++) {
          if (
            node[i] === 'ev' &&
            typeof node[i + 1] === 'number' &&
            typeof node[i + 2] === 'number' &&
            node[i + 3] === 'rnd' &&
            node[i + 4] === '/ev' &&
            typeof node[i + 5] === 'object' &&
            node[i + 5] !== null &&
            'VAR=' in node[i + 5]
          ) {
            const varName = node[i + 5]['VAR=']
            const min = node[i + 1]
            const max = node[i + 2]
            randomVars.set(varName, { min, max })
          }
        }

        // Continue traversing
        node.forEach(traverse)
      } else if (typeof node === 'object' && node !== null) {
        Object.values(node).forEach(traverse)
      }
    }

    traverse(inkJson)
  } catch (error) {
    // Silently fail if JSON parsing fails
  }

  return randomVars
}

/**
 * Create a node with consistent field ordering
 */
function createNode({
  id,
  text,
  type,
  choiceLabel,
  requirements,
  effects,
  repeatable,
  repeatFrom,
  numContinues,
  children,
}) {
  const node = {
    id,
    text,
    type,
  }

  // Add optional fields in order
  if (choiceLabel !== undefined) {
    node.choiceLabel = choiceLabel
  }
  if (requirements !== undefined && requirements.length > 0) {
    node.requirements = requirements
  }
  if (effects !== undefined && effects.length > 0) {
    node.effects = effects
  }

  // Only include repeatable if it's true
  if (repeatable === true) {
    node.repeatable = true
  }

  // Add repeatFrom to reference the ancestor node being repeated
  if (repeatFrom !== undefined) {
    node.repeatFrom = repeatFrom
  }

  // Add numContinues for dialogue nodes
  if (type === 'dialogue' && numContinues !== undefined) {
    node.numContinues = numContinues
  }

  if (children !== undefined && children.length > 0) {
    node.children = children
  }

  return node
}

/**
 * Parse a single Ink story and build a hierarchical tree by exploring all paths
 */
function parseInkStory(inkJsonString, eventName) {
  try {
    // Reset counters for each event
    nodeIdCounter = 0
    totalNodesInCurrentEvent = 0

    // Detect random variables before executing the story
    const randomVars = detectRandomVariables(inkJsonString)

    // Log detected random variables for debugging
    if (randomVars.size > 0) {
      const varList = Array.from(randomVars.entries())
        .map(([name, range]) => `${name}(${range.min}-${range.max})`)
        .join(', ')
      console.log(`  📊 Random variables: ${varList}`)
    }

    const story = new Story(inkJsonString)

    // Build tree by exploring all possible paths
    const rootNode = buildTreeFromStory(story, eventName, new Set(), 0, '', [], [], [], randomVars)

    if (!rootNode) {
      console.warn(`  ⚠️  Event "${eventName}" produced empty tree`)
      return null
    }

    if (totalNodesInCurrentEvent >= MAX_NODES_PER_EVENT) {
      console.warn(
        `  ⚠️  Event "${eventName}" hit node limit (${MAX_NODES_PER_EVENT} nodes) - tree may be incomplete`
      )
    }

    // Fix repeatFrom for choice nodes (post-processing)
    fixChoiceRepeatFrom(rootNode)

    return rootNode
  } catch (error) {
    console.error(`  ❌ Error parsing event "${eventName}":`, error.message)
    return null
  }
}

/**
 * Build a hierarchical tree by recursively exploring all story paths
 */
function buildTreeFromStory(
  story,
  eventName,
  visitedStates = new Set(),
  depth = 0,
  pathHash = '',
  ancestorTexts = [],
  ancestorChoices = [],
  ancestorNodes = [],
  randomVars = new Map()
) {
  // Check node limit to prevent infinite exploration
  if (totalNodesInCurrentEvent >= MAX_NODES_PER_EVENT) {
    console.warn(
      `  ⚠️  Event "${eventName}" reached node limit (${MAX_NODES_PER_EVENT}) - truncating branch`
    )
    return null
  }

  // Prevent infinite loops and excessive depth
  const MAX_DEPTH = 15 // Limit depth for performance
  if (depth > MAX_DEPTH) {
    console.warn(`  ⚠️  Event "${eventName}" reached max depth (${MAX_DEPTH}) - truncating branch`)
    totalNodesInCurrentEvent++
    return createNode({
      id: generateNodeId(),
      text: '[Max depth reached]',
      type: 'end',
    })
  }

  // Create a simpler state hash based on path instead of full JSON (much faster)
  const currentPathHash = `${pathHash}_${story.state.currentPathString || ''}`
  if (visitedStates.has(currentPathHash)) {
    return null // Already visited this state
  }

  const newVisitedStates = new Set(visitedStates)
  newVisitedStates.add(currentPathHash)

  // Collect all text from the current segment
  let text = ''
  let continueCount = 0

  try {
    // Continue the story until we hit choices or the end
    // Preserve newlines for proper command extraction
    while (story.canContinue) {
      const line = story.Continue()
      continueCount++
      if (line && line.trim()) {
        // Check if this line contains any random variable references
        // Look for common effect commands that might have random values
        if (randomVars.size > 0 && />>>>(GOLD|DAMAGE|HEALTH|MAXHEALTH):\d+/.test(line)) {
          let modifiedLine = line
          let foundRandom = false

          // Match any command with a numeric value
          const commandMatches = line.match(/>>>>(GOLD|DAMAGE|HEALTH|MAXHEALTH):(\d+)/g)
          if (commandMatches) {
            for (const match of commandMatches) {
              const [, command, valueStr] = match.match(/>>>>(GOLD|DAMAGE|HEALTH|MAXHEALTH):(\d+)/)
              const value = parseInt(valueStr)

              // Map command names to likely variable names in Ink
              // e.g., GOLD command likely uses 'gold' variable, DAMAGE uses 'damage', etc.
              const likelyVarName = command.toLowerCase()

              // Check if this specific variable name has a random range
              if (randomVars.has(likelyVarName)) {
                const range = randomVars.get(likelyVarName)
                // Verify the value falls within the range
                if (value >= range.min && value <= range.max) {
                  // Replace ALL occurrences of this specific command:value with the random notation
                  const randomNotation = `random [${range.min} - ${range.max}]`
                  modifiedLine = modifiedLine.replace(
                    new RegExp(`>>>>${command}:${value}`, 'g'),
                    `>>>>${command}:${randomNotation}`
                  )
                  foundRandom = true
                  console.log(
                    `  🎲 Event "${eventName}": Detected random ${command} value ${value} (range: ${range.min}-${range.max})`
                  )
                }
              }
            }

            if (foundRandom) {
              text += (text ? '\n' : '') + modifiedLine.trim()
              continue // Skip the normal text concatenation
            }
          }
        }
        text += (text ? '\n' : '') + line.trim()
      }
    }
  } catch (error) {
    // Some stories have runtime errors - handle gracefully
    console.warn(`⚠️  Runtime error in "${eventName}": ${error.message}`)
  }

  // numContinues is the number of player clicks needed (continueCount - 1)
  // because the first Continue() call shows the initial text automatically
  const numContinues = Math.max(0, continueCount - 1)

  // Get current choices (i.e: child nodes) in the story.
  const choices = story.currentChoices || []

  // Determine node type BEFORE cleaning (to detect combat/commands)
  const type = determineNodeType(text, choices.length === 0)

  // Extract effects from the beginning of text, then clean the rest
  const { effects, cleanedText } = extractEffects(text)

  // If we have no cleaned text and no choices, check if it's a special node type
  if (!cleanedText && choices.length === 0) {
    // If it's a combat or special command node, keep it
    if (type === 'combat') {
      // Combat-only event (like Mimic)
      totalNodesInCurrentEvent++
      return createNode({
        id: generateNodeId(),
        text: undefined,
        type: 'combat',
      })
    }

    // If we have effects but no text/choices, this is an effects-only end node
    if (effects && effects.length > 0) {
      totalNodesInCurrentEvent++
      return createNode({
        id: generateNodeId(),
        text: undefined,
        type: 'end',
        effects,
        repeatable: false,
      })
    }

    // If we're at a leaf node with no text and no effects (e.g., "Leave" choice with just "end"),
    // create an empty end node instead of returning null
    // This ensures choices that lead to immediate endings are still represented in the tree

    // Uncomment for debugging empty end nodes:
    // const pathInfo = ancestorTexts.length > 0 ? ancestorTexts[ancestorTexts.length - 1] : 'root'
    // const preview = pathInfo.length > 60 ? pathInfo.substring(0, 60) + '...' : pathInfo
    // console.log(
    //   `ℹ️  Event "${eventName}" - empty end node at depth ${depth}\n     Last node: "${preview}"`
    // )

    totalNodesInCurrentEvent++
    return createNode({
      id: generateNodeId(),
      text: undefined,
      type: 'end',
    })
  }

  const nodeId = generateNodeId()
  totalNodesInCurrentEvent++

  // Check if this node's text matches an ancestor (repeatable dialogue)
  const isRepeatable = cleanedText && ancestorTexts.includes(cleanedText)
  const repeatFromNodeId = isRepeatable
    ? ancestorNodes[ancestorTexts.indexOf(cleanedText)]?.id
    : undefined

  // If there are no choices, this is a leaf node
  if (choices.length === 0) {
    return createNode({
      id: nodeId,
      text: cleanedText || '[End]',
      type: type === 'dialogue' ? 'end' : type,
      effects,
      repeatable: isRepeatable,
      repeatFrom: repeatFromNodeId,
      numContinues,
    })
  }

  // If this node is repeatable, don't explore children (avoid infinite loop)
  if (isRepeatable) {
    return createNode({
      id: nodeId,
      text: cleanedText,
      type,
      effects,
      repeatable: true,
      repeatFrom: repeatFromNodeId,
      numContinues,
    })
  }

  // Build children by exploring each choice
  const children = []
  const currentNodeInfo = { id: nodeId, text: cleanedText }
  const newAncestorTexts = cleanedText ? [...ancestorTexts, cleanedText] : ancestorTexts
  const newAncestorNodes = cleanedText ? [...ancestorNodes, currentNodeInfo] : ancestorNodes

  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i]

    // Extract requirements and clean choice text FIRST to check for repetition
    const { requirements, cleanedText: choiceText } = extractChoiceMetadata(choice.text)

    // Check if this choice label has appeared before (repeatable choice)
    const isRepeatableChoice = choiceText && ancestorChoices.includes(choiceText)

    if (isRepeatableChoice) {
      // This choice loops back - create a repeatable choice node without exploring further
      // Note: repeatFrom will be filled in by fixChoiceRepeatFrom() post-processing
      const repeatableNode = createNode({
        id: generateNodeId(),
        text: '', // Empty text prevents separateChoicesFromEffects from splitting this node
        type: 'choice',
        choiceLabel: choiceText,
        requirements: requirements.length > 0 ? requirements : undefined,
        repeatable: true,
      })
      children.push(repeatableNode)
      totalNodesInCurrentEvent++
      continue // Skip exploring this branch
    }

    // Save story state before making choice
    const savedState = story.state.toJson()

    try {
      // Make the choice
      story.ChooseChoiceIndex(i)

      // Add this choice to the ancestor path for loop detection
      const newAncestorChoices = choiceText ? [...ancestorChoices, choiceText] : ancestorChoices

      // Recursively build tree for this branch
      const childNode = buildTreeFromStory(
        story,
        eventName,
        newVisitedStates,
        depth + 1,
        `${currentPathHash}_c${i}`,
        newAncestorTexts,
        newAncestorChoices,
        newAncestorNodes,
        randomVars
      )

      if (childNode) {
        // Reconstruct node with proper field ordering (choiceLabel after type)
        const orderedChild = createNode({
          id: childNode.id,
          text: childNode.text,
          type: childNode.type,
          choiceLabel: choiceText,
          requirements: requirements.length > 0 ? requirements : childNode.requirements,
          effects: childNode.effects,
          repeatable: childNode.repeatable,
          repeatFrom: childNode.repeatFrom,
          numContinues: childNode.numContinues,
          children: childNode.children,
        })

        children.push(orderedChild)
      }
    } catch (error) {
      console.warn(`    ⚠️  Error exploring choice in "${eventName}": ${error.message}`)
    }

    // Restore story state for next choice
    story.state.LoadJson(savedState)
  }

  // Build the node
  return createNode({
    id: nodeId,
    text: cleanedText || '[Choice point]',
    type,
    effects,
    numContinues,
    children,
  })
}

/**
 * Extract effects (game commands) from text (beginning or middle)
 * Returns { effects: [...], cleanedText: "..." }
 */
function extractEffects(text) {
  if (!text) return { effects: [], cleanedText: '' }

  const effects = []
  let cleaned = text

  // Extract entire command sequences: >>>>COMMAND1:value1;COMMAND2:value2;COMMAND3
  // Pattern matches from >>> until we hit a newline, quote, or end
  // Includes uppercase, lowercase, numbers, and common punctuation in values
  const commandSequencePattern = />>>>?[A-Za-z0-9_:;'\[\]\(\)\s\-\/]+(?=\n|"|$)/gi

  cleaned = cleaned.replace(commandSequencePattern, (commandSequence) => {
    // Now split the sequence by semicolons and process each command
    const commands = commandSequence.split(';')

    commands.forEach((cmd) => {
      // Remove >>> prefix if present
      cmd = cmd.replace(/^>>>+/, '').trim()
      if (!cmd) return

      // Parse COMMAND or COMMAND:value (case-insensitive)
      const match = cmd.match(/^([A-Za-z_]+)(?::(.+))?$/i)
      if (!match) return

      const command = match[1].toUpperCase()
      const value = match[2] ? match[2].trim() : null

      let effect
      if (value) {
        switch (command) {
          case 'COMBAT':
          case 'DIRECTCOMBAT':
            effect = `COMBAT: ${value}`
            break
          default:
            effect = `${command}: ${value}`
        }
      } else {
        effect = command
      }

      effects.push(effect)
    })

    return '' // Remove entire command sequence from text
  })

  // Remove any leftover semicolons from removed commands
  cleaned = cleaned.replace(/;+/g, ';').replace(/^;+|;+$/g, '')

  // Clean the remaining text (remove markup, etc.)
  const cleanedText = cleanText(cleaned)

  return { effects, cleanedText }
}

/**
 * Extract requirements from choice text and return cleaned text
 */
function extractChoiceMetadata(choiceText) {
  const requirements = []
  let cleanedText = choiceText

  // Pattern: "requirement:value;" OR "requirement;" (single word without value)
  // Loop to extract all requirements before the actual text
  const reqPattern = /^([!]?[a-z]+(?::[^;]+)?);/
  let match

  while ((match = cleanedText.match(reqPattern))) {
    const reqString = match[1]

    // Parse requirement (convert negated requirements to NOT format)
    if (reqString.startsWith('!')) {
      // Convert "!questflag:priest" to "NOT questflag:priest"
      requirements.push('NOT ' + reqString.substring(1))
    } else {
      requirements.push(reqString)
    }

    // Remove this requirement from text and continue looking for more
    cleanedText = cleanedText.replace(reqPattern, '').trim()
  }

  // Clean up the text
  cleanedText = cleanText(cleanedText)

  return { requirements, cleanedText }
}

/**
 * Clean text by removing Ink/game-specific markup and converting commands to readable format
 */
function cleanText(text) {
  if (!text) return ''

  let cleaned = text

  // Convert game commands to human-readable placeholders
  // Match until semicolon, newline, quote, or another command (>>>)
  cleaned = cleaned.replace(
    />>>>?([A-Z_]+):([^;\n>"]+?)(?=>>>|;|\n|"|$)/gi,
    (_match, command, value) => {
      // Trim any trailing whitespace from the value
      value = value.trim()
      // Parse different command types
      switch (command.toUpperCase()) {
        case 'COMBAT':
        case 'DIRECTCOMBAT':
          return `[Combat: ${value}]`
        case 'MERCHANT':
          return '[Merchant]'
        case 'GOLD':
          return `[Gold: ${value}]`
        case 'HEALTH':
          return `[Health: ${value}]`
        case 'RELOADEVENTS':
          return '[Reload Events]'
        case 'QUESTFLAG':
          return `[Quest Flag: ${value}]`
        case 'NEXTSTATUS':
          return `[Status: ${value}]`
        default:
          // Generic command format
          return `[${command}: ${value}]`
      }
    }
  )

  // Remove standalone commands (no colon/value)
  cleaned = cleaned.replace(/>>>>?([A-Z_]+)(?![:\w])/gi, (_match, command) => {
    switch (command.toUpperCase()) {
      case 'MERCHANT':
        return '[Merchant]'
      case 'RELOADEVENTS':
        return '' // Remove RELOADEVENTS completely
      case 'END':
        return '[End]'
      default:
        return `[${command}]`
    }
  })

  // Remove color tags
  cleaned = cleaned.replace(/<color=[^>]+>/gi, '').replace(/<\/color>/gi, '')

  // Remove HTML tags
  cleaned = cleaned.replace(/<\/?[bi]>/gi, '')
  cleaned = cleaned.replace(/<\/?b>/gi, '')

  // Remove speaker tags like {#:"speaker"}
  cleaned = cleaned.replace(/\{#[^}]+\}/g, '')

  // Remove conditional text markers (these are if/else checks for what text to display)
  // Examples: [?questflag:stormscarredintro], [?talent:stormscarred;!questflag:stormscarredintro], [?!questflag:quit]
  cleaned = cleaned.replace(/\[\?[^\]]+\]/g, '')

  // Remove [continue] markers (these are part of the conditional text system)
  cleaned = cleaned.replace(/\[continue\]/gi, '')

  // Remove leftover command brackets (these should have been extracted as effects)
  // Examples: [DAMAGE: 10], [GOLD: -20], [Health: 50]
  cleaned = cleaned.replace(/\[(DAMAGE|GOLD|HEALTH|Health|Gold):[^\]]+\];?\s*/gi, '')

  // Remove newline escapes
  cleaned = cleaned.replace(/\\n/g, ' ')

  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ')

  // Remove trailing punctuation artifacts
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Determine node type based on content
 */
function determineNodeType(text, isLeaf) {
  if (!text) return 'choice'

  // Check for combat
  if (text.includes('COMBAT:') || text.includes('>>>COMBAT') || text.includes('>>>>COMBAT')) {
    return 'combat'
  }

  // Leaf nodes are end nodes
  if (isLeaf) {
    return 'end'
  }

  // Otherwise it's dialogue
  return 'dialogue'
}

/**
 * Main processing function
 */
function processEvents() {
  console.log('📖 Reading events file...')
  const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))

  console.log(`\n🔍 Processing ${events.length} events...\n`)

  const eventTrees = []
  let successCount = 0
  let errorCount = 0
  let emptyCount = 0

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const { name, type, artwork, text, excluded, caption } = event

    // Use caption as name if it exists, otherwise use name
    const displayName = caption || name

    if (!text) {
      console.log(`  ⊘  [${i + 1}/${events.length}] Skipping "${displayName}" (no text content)`)
      emptyCount++
      continue
    }

    // Handle excluded events - keep them but don't parse the tree
    if (excluded) {
      console.log(`  ✂️  [${i + 1}/${events.length}] Excluding "${displayName}" (blacklisted)`)
      eventTrees.push({
        name: displayName,
        type,
        artwork,
        excluded: true,
      })
      successCount++
      continue
    }

    console.log(`  → [${i + 1}/${events.length}] Parsing "${displayName}" (type ${type})...`)

    const rootNode = parseInkStory(text, displayName)

    if (rootNode) {
      eventTrees.push({
        name: displayName,
        type,
        artwork: artwork || '',
        rootNode,
      })
      successCount++
      console.log(`    ✓ Success (${countNodes(rootNode)} nodes)`)
    } else {
      errorCount++
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`  ✅ Successfully parsed: ${successCount}`)
  console.log(`  ❌ Failed to parse: ${errorCount}`)
  console.log(`  ⊘  No content: ${emptyCount}`)
  console.log(`  📋 Total event trees: ${eventTrees.length}`)

  // Calculate total nodes
  const totalNodes = eventTrees.reduce((sum, tree) => sum + countNodes(tree.rootNode), 0)
  console.log(`  🌳 Total nodes across all trees: ${totalNodes}`)

  // Sort events alphabetically by name
  console.log(`\n🔤 Sorting events alphabetically...`)
  eventTrees.sort((a, b) => a.name.localeCompare(b.name))

  // Write output
  console.log(`\n💾 Writing to ${OUTPUT_FILE}...`)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(eventTrees, null, 2), 'utf-8')

  console.log('\n✨ Done!')

  // Separate choices from their effects for clearer visualization
  console.log('\n🔀 Separating choices from effects...')
  let totalSeparated = 0
  eventTrees.forEach((tree) => {
    const separatedCount = separateChoicesFromEffects(tree.rootNode)
    totalSeparated += separatedCount
  })
  console.log(`  Separated ${totalSeparated} choice-effect pairs`)

  // Move repeatFrom from children to parents for cleaner visualization
  console.log('\n📤 Moving repeatFrom to parent nodes...')
  eventTrees.forEach((tree) => {
    moveRepeatFromToParent(tree.rootNode)
  })

  // Calculate final stats
  const finalTotalNodes = eventTrees.reduce((sum, tree) => sum + countNodes(tree.rootNode), 0)
  console.log(`  Final node count: ${finalTotalNodes}`)

  // Re-write output with separated nodes
  console.log(`\n💾 Re-writing to ${OUTPUT_FILE}...`)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(eventTrees, null, 2), 'utf-8')

  console.log('\n✨ Done!')

  // Show sample output
  if (eventTrees.length > 0) {
    console.log('\n📋 Sample event trees:')
    eventTrees.slice(0, 3).forEach((tree) => {
      const nodeCount = countNodes(tree.rootNode)
      const maxDepth = getMaxDepth(tree.rootNode)
      console.log(
        `  - "${tree.name}" (type ${tree.type}): ${nodeCount} nodes, max depth ${maxDepth}`
      )
    })
  }
}

/**
 * Fix repeatFrom references for choice nodes by searching ancestors
 * This is a post-processing step after the tree is built
 */
function fixChoiceRepeatFrom(node, choiceAncestors = []) {
  if (!node) return

  // If this is a repeatable choice node without repeatFrom, find the ancestor
  if (node.repeatable && node.choiceLabel && !node.repeatFrom) {
    // Find the first ancestor with the same choice label
    const matchingAncestor = choiceAncestors.find((a) => a.choiceLabel === node.choiceLabel)
    if (matchingAncestor) {
      node.repeatFrom = matchingAncestor.id
    }
  }

  // Add this node to ancestors if it has a choice label
  const newAncestors = node.choiceLabel
    ? [...choiceAncestors, { id: node.id, choiceLabel: node.choiceLabel }]
    : choiceAncestors

  // Recursively process children
  if (node.children) {
    node.children.forEach((child) => fixChoiceRepeatFrom(child, newAncestors))
  }
}

/**
 * Move repeatFrom from children to their parent nodes
 * Rule: If a child has both repeatable and repeatFrom, move repeatFrom to parent
 */
function moveRepeatFromToParent(node) {
  if (!node || !node.children) return

  // Check each child
  for (const child of node.children) {
    // If child has repeatFrom, move it to parent (this node)
    if (child.repeatFrom) {
      node.repeatFrom = child.repeatFrom
      delete child.repeatFrom
    }

    // Recursively process child's descendants
    moveRepeatFromToParent(child)
  }
}

/**
 * Separate choices from their effects for clearer visualization
 * When a node has both a choiceLabel and effects/children, split it into:
 * 1. A choice node (with choiceLabel and requirements)
 * 2. An outcome node (with effects and/or children)
 * Returns the number of nodes separated
 */
function separateChoicesFromEffects(node) {
  if (!node) return 0

  let separatedCount = 0

  // Process children first (bottom-up)
  if (node.children && node.children.length > 0) {
    // Create new children array to handle modifications
    const newChildren = []

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]

      // Recursively process this child's children
      separatedCount += separateChoicesFromEffects(child)

      // Check if this child needs to be split
      // Split if: has choiceLabel AND (has effects OR has text OR children OR is an end node)
      // This ensures all choices are consistently represented as choice nodes
      const hasChoiceLabel = child.choiceLabel && child.choiceLabel.trim()
      const hasEffects = child.effects && child.effects.length > 0
      const hasSubstantialText = child.text && child.text.trim() && child.text !== '[End]'
      const isEndNode = child.type === 'end'
      const shouldSplit =
        hasChoiceLabel &&
        (hasEffects || hasSubstantialText || (child.children && child.children.length > 0) || isEndNode)

      if (shouldSplit) {
        // Create a choice node (parent)
        const choiceNode = createNode({
          id: child.id,
          text: undefined, // Choice nodes don't have text
          type: 'choice',
          choiceLabel: child.choiceLabel,
          requirements: child.requirements,
          repeatFrom: child.repeatFrom, // Move repeatFrom to parent
        })

        // Create an outcome node (child)
        // Determine the outcome type:
        // - The original node was 'combat' -> 'combat'
        // - The original node had no children -> 'end'
        // - The original node was 'choice' or 'dialogue' -> 'dialogue'
        // - Otherwise -> keep the original type, BUT warn!
        const hasChildren = child.children && child.children.length > 0
        let outcomeType
        if (child.type === 'combat') {
          outcomeType = 'combat'
        } else if (!hasChildren) {
          outcomeType = 'end'
        } else if (child.type === 'choice' || child.type === 'dialogue') {
          outcomeType = 'dialogue'
        } else {
          console.warn('  ⚠️ Unexpected node split! Type: ', child.type, 'Node: ', child)
          outcomeType = child.type
        }

        const outcomeNode = createNode({
          id: generateNodeId(),
          text: child.text || '',
          type: outcomeType,
          effects: child.effects,
          repeatable: child.repeatable,
          numContinues: child.numContinues,
          children: child.children,
        })

        // Link them
        choiceNode.children = [outcomeNode]
        newChildren.push(choiceNode)
        separatedCount++
      } else {
        // Keep as is
        newChildren.push(child)
      }
    }

    node.children = newChildren
  }

  return separatedCount
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

// Run the script
try {
  processEvents()
} catch (error) {
  console.error('❌ Fatal error:', error)
  console.error(error.stack)
  process.exit(1)
}
