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
 * LOOP DETECTION AND DEDUPLICATION:
 * ----------------------------------
 * Uses a three-stage approach to detect and eliminate duplicate content:
 *
 * 1. TEXT-BASED LOOP DETECTION (during tree building):
 *    Detects when the same dialogue text appears in the ancestor chain.
 *    Creates ref nodes immediately to prevent dialogue loops.
 *
 * 2. CHOICE+PATH-BASED LOOP DETECTION (during tree building):
 *    Detects when the same choice structure appears at the same Ink story path.
 *    Creates ref nodes to prevent merchant/shop loops where choices repeat.
 *
 * 3. STRUCTURAL DEDUPLICATION (post-processing):
 *    Uses breadth-first traversal to find structurally identical subtrees.
 *    Replaces duplicates with references, ensuring shallow nodes are originals.
 *
 * All duplicate nodes have a "ref" field pointing to the original node ID.
 * The D3 renderer should use the ref field to loop back to the original node.
 */

const EVENTS_FILE = path.join(__dirname, './events.json')
const OUTPUT_FILE = path.join(__dirname, '../src/codex/data/event-trees.json')

// For the events in this list, we should not include nodes that have the
// choiceLabel === 'default' OR text === 'default'
// Skip those nodes along with their entire subtree.
const DEFAULT_NODE_BLACKLIST = [
  'A Familiar Face',
]

const CONFIG = {
  MAX_DEPTH: 100, // Limit depth for performance

  // SIBLING-FIRST EXPLORATION:
  // At shallow depths, we explore all siblings at each level before going deeper.
  // This ensures all major branches are explored even if one branch is very complex.
  // How it works: At each shallow level, we save story states for all choices,
  // then recursively explore each one. This allows all siblings to START their
  // exploration before the node limit kicks in.
  SIBLING_FIRST_DEPTH: 8, // Explore each sibling all the way until we reach this depth
  SIBLING_FIRST_NODE_BUDGET: 20000, // Max nodes to create during sibling-first phase

  // DEPTH-FIRST EXPLORATION:
  // After sibling-first phase, we switch to standard depth-first exploration.
  // Node counter is RESET when first entering depth-first phase for this event.
  DEPTH_FIRST_NODE_BUDGET: 5000, // Max nodes to create during depth-first phase
}

let nodeIdCounter = 0
let totalNodesInCurrentEvent = 0
let hasResetForDepthFirst = false // Track if we've reset the counter for this event

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
 *
 * Field order: id, text, type, choiceLabel, requirements, effects, numContinues, ref, children
 * Optional fields are only included if they have values.
 */
function createNode({ id, text, type, choiceLabel, requirements, effects, numContinues, ref, children }) {
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
 * Parse a single Ink story and build a hierarchical tree by exploring all paths
 */
function parseInkStory(inkJsonString, eventName) {
  try {
    // Reset counters for each event
    nodeIdCounter = 0
    totalNodesInCurrentEvent = 0
    hasResetForDepthFirst = false

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
    const rootNode = buildTreeFromStory(story, eventName, new Set(), new Map(), 0, '', [], new Map(), randomVars)

    if (!rootNode) {
      console.warn(`  ⚠️  Event "${eventName}" produced empty tree`)
      return null
    }

    // Check if we hit the depth-first node limit
    // Note: This check happens after the tree is built, so it only detects if we hit
    // the limit during depth-first phase (counter was reset at transition)
    if (totalNodesInCurrentEvent >= CONFIG.DEPTH_FIRST_NODE_BUDGET) {
      console.warn(
        `  ⚠️  Event "${eventName}" hit depth-first node limit - tree may be incomplete`
      )
    }

    return rootNode
  } catch (error) {
    console.error(`  ❌ Error parsing event "${eventName}":`, error.message)
    return null
  }
}

/**
 * Build a hierarchical tree by recursively exploring all story paths
 *
 * EXPLORATION STRATEGY:
 * - Sibling-first (depths < SIBLING_FIRST_DEPTH): All siblings explored before going deep
 * - Depth-first (depths >= SIBLING_FIRST_DEPTH): Standard recursive exploration
 *
 * LOOP DETECTION (during tree building):
 * 1. Text-based: Detects when the same dialogue text appears before
 * 2. Choice+path-based: Detects when the same choice structure appears at the same Ink path
 * When a loop is detected, creates a ref node pointing to the original occurrence.
 *
 * Post-processing deduplication will find additional structural duplicates that aren't loops.
 */
function buildTreeFromStory(
  story,
  eventName,
  visitedStates = new Set(),
  stateToNodeId = new Map(),
  depth = 0,
  pathHash = '',
  ancestorTexts = [],
  textToNodeId = new Map(),
  randomVars = new Map()
) {
  // Check node limit to prevent infinite exploration
  const inSiblingFirstMode = depth < CONFIG.SIBLING_FIRST_DEPTH
  const inDepthFirstMode = depth >= CONFIG.SIBLING_FIRST_DEPTH

  // RESET node counter when transitioning from sibling-first to depth-first
  // This happens exactly ONCE when we first reach SIBLING_FIRST_DEPTH
  if (depth === CONFIG.SIBLING_FIRST_DEPTH && !hasResetForDepthFirst) {
    hasResetForDepthFirst = true
    totalNodesInCurrentEvent = 0
  }

  if (inSiblingFirstMode) {
    // During sibling-first phase: use separate budget
    if (totalNodesInCurrentEvent >= CONFIG.SIBLING_FIRST_NODE_BUDGET) {
      console.warn(
        `  ⚠️  Event "${eventName}" reached sibling-first budget (${CONFIG.SIBLING_FIRST_NODE_BUDGET}) at depth ${depth} - truncating branch`
      )
      return null
    }
  } else if (inDepthFirstMode) {
    // During depth-first phase: use depth-first limit
    if (totalNodesInCurrentEvent >= CONFIG.DEPTH_FIRST_NODE_BUDGET) {
      console.warn(
        `  ⚠️  Event "${eventName}" reached depth-first node limit (${CONFIG.DEPTH_FIRST_NODE_BUDGET}) - truncating branch`
      )
      return null
    }
  }

  // Prevent infinite loops and excessive depth
  if (depth > CONFIG.MAX_DEPTH) {
    console.warn(`  ⚠️  Event "${eventName}" reached max depth (${CONFIG.MAX_DEPTH}) - truncating branch`)
    totalNodesInCurrentEvent++
    return createNode({
      id: generateNodeId(),
      text: '[Max depth reached]',
      type: 'end',
    })
  }

  // Collect all text from the current segment FIRST
  // We need this before loop detection so we can check for text-based loops
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

  // DUAL LOOP DETECTION STRATEGY:
  // Detects loops during tree building to prevent infinite exploration
  // and create ref nodes immediately when patterns repeat

  // 1. TEXT-BASED LOOP DETECTION (catches dialogue loops like The Ferryman)
  // Check if we've seen this exact text before in our exploration
  if (cleanedText && textToNodeId.has(cleanedText)) {
    const originalNodeId = textToNodeId.get(cleanedText)
    totalNodesInCurrentEvent++
    // Create ref node pointing to the first occurrence of this text
    return createNode({
      id: generateNodeId(),
      text: cleanedText,
      type: type,
      effects: effects,
      numContinues: numContinues,
      ref: originalNodeId,
    })
  }

  // 2. CHOICE+PATH-BASED LOOP DETECTION (catches merchant/shop loops)
  // For merchant/shop events, the same choices repeat even though game state differs
  // Hash combines choice structure + Ink story path to detect loops
  const choiceLabels = choices.map((c) => extractChoiceMetadata(c.text).cleanedText).join('|')
  const currentStateHash = `${pathHash}_${choiceLabels}_${story.state.currentPathString || ''}`

  // Check if we've visited this exact state before (same choices + location)
  if (visitedStates.has(currentStateHash)) {
    const originalNodeId = stateToNodeId.get(currentStateHash)
    totalNodesInCurrentEvent++
    // Create ref node with all details preserved except children
    return createNode({
      id: generateNodeId(),
      text: cleanedText,
      type: type,
      effects: effects,
      numContinues: numContinues,
      ref: originalNodeId,
    })
  }

  // Clone tracking maps for this branch to maintain separate state per path
  const newVisitedStates = new Set(visitedStates)
  newVisitedStates.add(currentStateHash)
  const newStateToNodeId = new Map(stateToNodeId)
  const newTextToNodeId = new Map(textToNodeId)

  // Track ancestor texts (unused but kept for potential future use)
  const newAncestorTexts = cleanedText ? [...ancestorTexts, cleanedText] : ancestorTexts

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
      })
    }

    // If we're at a leaf node with no text and no effects (e.g., "Leave" choice with just "end"),
    // create an empty end node instead of returning null
    // This ensures choices that lead to immediate endings are still represented in the tree

    // Debug logging for empty end nodes (disabled)
    // Uncomment to see where empty end nodes are created

    totalNodesInCurrentEvent++
    return createNode({
      id: generateNodeId(),
      text: undefined,
      type: 'end',
    })
  }

  const nodeId = generateNodeId()
  totalNodesInCurrentEvent++

  // Store this node ID for choice+path-based loop detection
  newStateToNodeId.set(currentStateHash, nodeId)

  // Store text-to-node mapping for text-based loop detection
  if (cleanedText) {
    newTextToNodeId.set(cleanedText, nodeId)
  }

  // If there are no choices, this is a leaf node
  if (choices.length === 0) {
    return createNode({
      id: nodeId,
      text: cleanedText || '[End]',
      type: type === 'dialogue' ? 'end' : type,
      effects,
      numContinues,
    })
  }

  // Build children by exploring each choice
  const children = []

  // HYBRID SIBLING-FIRST/DEPTH-FIRST EXPLORATION
  // For shallow depths (< SIBLING_FIRST_DEPTH), we use sibling-first exploration:
  // all siblings at this level are explored before going deeper into any single branch.
  // This ensures all major branches get explored even if one branch is very complex.
  const useSiblingFirst = depth < CONFIG.SIBLING_FIRST_DEPTH

  if (useSiblingFirst) {
    // SIBLING-FIRST: Two-pass approach
    // Pass 1: Save story states for all choices at this level (doesn't recurse yet)
    const childData = []

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i]
      const { requirements, cleanedText: choiceText } = extractChoiceMetadata(choice.text)
      const savedState = story.state.toJson()

      try {
        story.ChooseChoiceIndex(i)

        // Save the story state after making this choice
        const childState = story.state.toJson()

        childData.push({
          choiceIndex: i,
          choiceText,
          requirements,
          storyState: childState,
          pathHash: `${currentStateHash}_c${i}`,
        })
      } catch (error) {
        console.warn(`    ⚠️  Error exploring choice in "${eventName}": ${error.message}`)
      }

      story.state.LoadJson(savedState)
    }

    // Pass 2: Now recursively explore each child (they explore deep, but all get a chance to start)
    for (const { choiceText, requirements, storyState, pathHash } of childData) {
      try {
        story.state.LoadJson(storyState)

        const childNode = buildTreeFromStory(
          story,
          eventName,
          newVisitedStates,
          newStateToNodeId,
          depth + 1,
          pathHash,
          newAncestorTexts,
          newTextToNodeId,
          randomVars
        )

        if (childNode) {
          const orderedChild = createNode({
            id: childNode.id,
            text: childNode.text,
            type: childNode.type,
            choiceLabel: choiceText,
            requirements: requirements.length > 0 ? requirements : childNode.requirements,
            effects: childNode.effects,
            numContinues: childNode.numContinues,
            ref: childNode.ref,
            children: childNode.children,
          })

          children.push(orderedChild)
        }
      } catch (error) {
        console.warn(`    ⚠️  Error in sibling-first child exploration: ${error.message}`)
      }
    }
  } else {
    // DEPTH-FIRST: Standard recursive exploration (current behavior)
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i]
      const { requirements, cleanedText: choiceText } = extractChoiceMetadata(choice.text)
      const savedState = story.state.toJson()

      try {
        story.ChooseChoiceIndex(i)

        // Recursively build tree for this branch
        const childNode = buildTreeFromStory(
          story,
          eventName,
          newVisitedStates,
          newStateToNodeId,
          depth + 1,
          `${currentStateHash}_c${i}`,
          newAncestorTexts,
          newTextToNodeId,
          randomVars
        )

        if (childNode) {
          const orderedChild = createNode({
            id: childNode.id,
            text: childNode.text,
            type: childNode.type,
            choiceLabel: choiceText,
            requirements: requirements.length > 0 ? requirements : childNode.requirements,
            effects: childNode.effects,
            numContinues: childNode.numContinues,
            ref: childNode.ref,
            children: childNode.children,
          })

          children.push(orderedChild)
        }
      } catch (error) {
        console.warn(`    ⚠️  Error exploring choice in "${eventName}": ${error.message}`)
      }

      story.state.LoadJson(savedState)
    }
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
  const startTime = Date.now()

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

  // Filter out default nodes for specific events
  console.log('\n🗑️  Filtering default nodes for blacklisted events...')
  let totalFiltered = 0
  eventTrees.forEach((tree) => {
    if (DEFAULT_NODE_BLACKLIST.includes(tree.name)) {
      const nodesBefore = countNodes(tree.rootNode)
      filterDefaultNodes(tree.rootNode)
      const nodesAfter = countNodes(tree.rootNode)
      const filtered = nodesBefore - nodesAfter
      if (filtered > 0) {
        console.log(`  - "${tree.name}": removed ${filtered} default nodes`)
        totalFiltered += filtered
      }
    }
  })
  if (totalFiltered > 0) {
    console.log(`  Total default nodes filtered: ${totalFiltered}`)
  } else {
    console.log(`  No default nodes found`)
  }

  // Separate choices from their effects for clearer visualization
  console.log('\n🔀 Separating choices from effects...')
  let totalSeparated = 0
  eventTrees.forEach((tree) => {
    const separatedCount = separateChoicesFromEffects(tree.rootNode)
    totalSeparated += separatedCount
  })
  console.log(`  Separated ${totalSeparated} choice-effect pairs`)

  // Calculate stats before deduplication
  const nodesBeforeDedupe = eventTrees.reduce((sum, tree) => sum + countNodes(tree.rootNode), 0)

  // Deduplicate subtrees
  console.log('\n🔄 Deduplicating subtrees...')
  const { totalDuplicates, totalNodesRemoved, eventsWithDedupe } = deduplicateAllTrees(eventTrees)
  console.log(`  Replaced ${totalDuplicates} duplicate subtrees`)
  console.log(`  Reduced node count by ${totalNodesRemoved}`)

  if (eventsWithDedupe.length > 0) {
    console.log(`\n  Events with deduplication:`)
    eventsWithDedupe.forEach(({ name, duplicates, nodesRemoved }) => {
      console.log(`    - "${name}": ${duplicates} duplicates, ${nodesRemoved} nodes removed`)
    })
  }

  // Calculate final stats
  const finalTotalNodes = eventTrees.reduce((sum, tree) => sum + countNodes(tree.rootNode), 0)
  console.log(`\n  Final node count: ${finalTotalNodes} (was ${nodesBeforeDedupe})`)

  // Re-write output with deduplicated nodes
  console.log(`\n💾 Re-writing to ${OUTPUT_FILE}...`)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(eventTrees, null, 2), 'utf-8')

  console.log('\n✨ Done!')

  // Show elapsed time
  const endTime = Date.now()
  const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2)
  console.log(`⏱️  Total parsing time: ${elapsedSeconds}s`)

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

/**
 * Check if two subtrees are structurally identical at depth 1 (immediate children only)
 *
 * Compares:
 * - Number of children
 * - For each child: text, choiceLabel, type, requirements, effects
 *
 * Does NOT recursively compare deeper levels (only depth 1).
 */
function areSubtreesIdentical(nodeA, nodeB) {
  // Must have same number of children
  const childrenA = nodeA.children || []
  const childrenB = nodeB.children || []

  if (childrenA.length !== childrenB.length) return false

  // If both have no children, they're identical (both leaf nodes)
  if (childrenA.length === 0) return true

  // Check each child at depth 1 only
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
  const MIN_SUBTREE_SIZE = 3 // Only dedupe if subtree has at least 3 nodes
  const subtreeMap = new Map() // signature -> first occurrence node id
  let duplicatesFound = 0
  let nodesRemoved = 0

  // Breadth-first traversal to process nodes from shallowest to deepest
  const queue = [rootNode]
  const allNodes = []

  while (queue.length > 0) {
    const node = queue.shift()
    if (!node) continue

    allNodes.push(node)

    if (node.children) {
      queue.push(...node.children)
    }
  }

  // Process nodes in breadth-first order (shallowest first)
  for (const node of allNodes) {
    if (!node.children || node.children.length === 0) continue
    if (node.ref) continue // Skip nodes that are already references

    // Check if this subtree is large enough to deduplicate
    const subtreeSize = countNodes(node)
    if (subtreeSize >= MIN_SUBTREE_SIZE) {
      // Create a simple signature based on node structure
      const signature = JSON.stringify({
        numChildren: node.children.length,
        childrenData: node.children.map((child) => ({
          text: child.text,
          choiceLabel: child.choiceLabel,
          type: child.type,
          requirements: child.requirements,
          effects: child.effects,
        })),
      })

      // Check if we've seen this signature before
      if (subtreeMap.has(signature)) {
        const originalNodeId = subtreeMap.get(signature)
        const originalNode = allNodes.find((n) => n.id === originalNodeId)

        // Deep check: are the subtrees truly identical?
        if (originalNode && areSubtreesIdentical(node, originalNode)) {
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
 * Deduplicate subtrees across all event trees
 */
function deduplicateAllTrees(eventTrees) {
  let totalDuplicates = 0
  let totalNodesRemoved = 0
  const eventsWithDedupe = []

  eventTrees.forEach((tree) => {
    if (tree.excluded || !tree.rootNode) {
      return
    }

    const { duplicatesFound, nodesRemoved } = deduplicateEventTree(tree.rootNode)

    if (duplicatesFound > 0) {
      eventsWithDedupe.push({
        name: tree.name,
        duplicates: duplicatesFound,
        nodesRemoved,
      })
    }

    totalDuplicates += duplicatesFound
    totalNodesRemoved += nodesRemoved
  })

  return { totalDuplicates, totalNodesRemoved, eventsWithDedupe }
}

// Run the script
try {
  processEvents()
} catch (error) {
  console.error('❌ Fatal error:', error)
  console.error(error.stack)
  process.exit(1)
}
