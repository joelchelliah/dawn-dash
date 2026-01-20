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
 * LOOP DETECTION AND DEDUPLICATION STRATEGY:
 * ------------------------------------------
 * Uses a multi-stage approach to detect and eliminate duplicate content:
 *
 * DURING TREE BUILDING (depth-first exploration):
 * 1. TEXT-BASED LOOP DETECTION:
 *    Detects when the same dialogue text appears in the ancestor chain.
 *    Creates ref nodes immediately to prevent infinite dialogue loops.
 *
 * 2. CHOICE+PATH-BASED LOOP DETECTION:
 *    Detects when the same choice structure appears at the same Ink story path.
 *    Creates ref nodes to prevent merchant/shop loops where choices repeat.
 *
 * 3. DIALOGUE MENU DETECTION (Rathael only):
 *    Detects question-asking patterns where you return to a menu with same questions.
 *    Matches on question choices only, preventing factorial explosion from question orderings.
 *
 * 4. PATH CONVERGENCE DETECTION (Frozen Heart only):
 *    Detects when reaching the same node (text + choices) via different paths.
 *    Creates ref nodes immediately, preventing re-exploration of identical branches.
 *    Only enabled for events in PATH_CONVERGENCE_EVENTS whitelist.
 *    WARNING: This is depth-first dedup that can conflict with breadth-first post-processing.
 *    Only use for events that truly need it (hit node limits without it).
 *
 * POST-PROCESSING (breadth-first deduplication):
 * 5. STRUCTURAL DEDUPLICATION:
 *    Uses breadth-first traversal to find remaining structurally identical subtrees.
 *    Replaces duplicates with references, ensuring shallow nodes become originals.
 *    Processes shallowest nodes first to maintain good tree structure for visualization.
 *
 * All duplicate nodes have a "ref" field pointing to the original node ID.
 * The D3 renderer uses the ref field to loop back to the original node.
 */

const EVENTS_FILE = path.join(__dirname, './events.json')
const OUTPUT_FILE = path.join(__dirname, '../src/codex/data/event-trees.json')

// For the events in this list, we should not include nodes that have the
// choiceLabel === 'default' OR text === 'default'
// Skip those nodes along with their entire subtree.
const DEFAULT_NODE_BLACKLIST = [
  'A Familiar Face',
]

// Special-case events with dialogue menu patterns (ask questions in any order)
// For these events, we detect when we're back at a menu with the same set of questions
// and create a ref immediately to prevent hitting the node limit DURING tree building.
//
// WHY WE NEED THIS:
// Without this early detection, Rathael's factorial explosion (9! = 362,880 orderings)
// would cause us to hit the 25k node budget during tree generation and create an
// incomplete tree. This early ref creation keeps the tree small enough to finish building.
//
// The post-processing collapseDialogueMenus() then further simplifies the already-built
// tree by combining all question choices into a single node for better visualization.
// Both are needed: this prevents generation failure, collapsing improves the final output.
const DIALOGUE_MENU_EVENTS = ['Rathael the Slain Death']

// Events that require path convergence detection (early deduplication during tree building)
// Most events don't need this - post-processing structural dedup is sufficient.
// However, "Frozen Heart" has such complex branching that it hits node limits without early dedup.
// Early dedup is depth-first (happens during recursive building), while post-processing dedup
// is breadth-first. Mixing them can cause issues where early dedup creates refs to nodes
// that post-processing dedup later removes. So we only enable it for events that truly need it.
const PATH_CONVERGENCE_EVENTS = ['Frozen Heart']

// Events that should skip the simple cousin ref conversion pass
// Some complex trees break when this pass reorders parents
const COUSIN_REF_BLACKLIST = ['Vesparin Vault']

const CONFIG = {
  PATH_CONVERGENCE_DEDUP_MIN_CHOICES: 3, // Only apply to nodes with at least this many choices
  FINAL_DEDUP_MIN_SUBTREE_SIZE: 3, // Only dedupe if subtree has at least this many nodes
  VERBOSE_LOGGING: false,
  MAX_DEPTH: 100, // Limit depth for performance

  // SIBLING-FIRST EXPLORATION:
  // At shallow depths, we explore all siblings at each level before going deeper.
  // This ensures all major branches are explored even if one branch is very complex.
  // How it works: At each shallow level, we save story states for all choices,
  // then recursively explore each one. This allows all siblings to START their
  // exploration before the node limit kicks in.
  SIBLING_FIRST_DEPTH: 8, // Explore each sibling all the way until we reach this depth
  SIBLING_FIRST_NODE_BUDGET: 50000, // Max nodes to create during sibling-first phase

  // DEPTH-FIRST EXPLORATION:
  // After sibling-first phase, we switch to standard depth-first exploration.
  // Node counter is RESET when first entering depth-first phase for this event.
  DEPTH_FIRST_NODE_BUDGET: 25000, // Max nodes to create during depth-first phase
}

let nodeIdCounter = 0
let totalNodesInCurrentEvent = 0
let hasResetForDepthFirst = false // Track if we've reset the counter for this event
let dialogueMenuStates = new Map() // Track dialogue menu states (for special events)
let pathConvergenceStates = new Map() // Track path convergence for early dedup (text + choices)

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
 * Parse a single Ink story and build a hierarchical tree by exploring all paths
 */
function parseInkStory(inkJsonString, eventName) {
  try {
    // Reset counters for each event
    nodeIdCounter = 0
    totalNodesInCurrentEvent = 0
    hasResetForDepthFirst = false
    dialogueMenuStates = new Map()
    pathConvergenceStates = new Map()

    // Detect random variables before executing the story
    const randomVars = detectRandomVariables(inkJsonString)

    // Log detected random variables for debugging
    if (randomVars.size > 0) {
      const varList = Array.from(randomVars.entries())
        .map(([name, range]) => `${name}(${range.min}-${range.max})`)
        .join(', ')
      if (CONFIG.VERBOSE_LOGGING) {
        console.log(`  📊 Random variables: ${varList}`)
      }
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
 * DEDUPLICATION DURING BUILDING:
 * 1. Text-based loop detection: Same dialogue text in ancestor chain
 * 2. Choice+path-based loop detection: Same choices at same Ink path
 * 3. Dialogue menu detection: Question menus (special events like Rathael)
 * 4. Early deduplication: Path convergence (same text + choices via different routes)
 * When detected, creates a ref node pointing to the original occurrence.
 *
 * Post-processing structural deduplication will find remaining identical subtrees.
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
  // RESET node counter when transitioning from sibling-first to depth-first
  // This happens exactly ONCE when we first reach SIBLING_FIRST_DEPTH
  if (depth === CONFIG.SIBLING_FIRST_DEPTH && !hasResetForDepthFirst) {
    hasResetForDepthFirst = true
    totalNodesInCurrentEvent = 0
  }

  // Prevent infinite loops and excessive depth (check this early before collecting text)
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
                  if (CONFIG.VERBOSE_LOGGING) {
                      console.log(
                      `  🎲 Event "${eventName}": Detected random ${command} value ${value} (range: ${range.min}-${range.max})`
                    )
                  }
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


  // LOOP DETECTION & EARLY DEDUPLICATION:
  // Multiple strategies detect patterns during tree building and create ref nodes
  // to prevent infinite exploration and reduce redundant path exploration

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

  // Check node limit to prevent infinite exploration
  // We check this AFTER collecting text/choices so we can log useful info
  const inSiblingFirstMode = depth < CONFIG.SIBLING_FIRST_DEPTH
  const inDepthFirstMode = depth >= CONFIG.SIBLING_FIRST_DEPTH

  if (inSiblingFirstMode) {
    // During sibling-first phase: use separate budget
    if (totalNodesInCurrentEvent >= CONFIG.SIBLING_FIRST_NODE_BUDGET) {
      const preview = cleanedText ? cleanedText.substring(0, 50) : '(no text)'
      const choiceCount = choices.length
      console.warn(
        `  ⚠️  Event "${eventName}" reached sibling-first budget (${CONFIG.SIBLING_FIRST_NODE_BUDGET}) at depth ${depth}`
      )
      if (CONFIG.VERBOSE_LOGGING) {
        console.warn(`      Text: "${preview}${cleanedText && cleanedText.length > 50 ? '...' : ''}"`)
        console.warn(`      Choices: ${choiceCount}`)
      }
      return null
    }
  } else if (inDepthFirstMode) {
    // During depth-first phase: use depth-first limit
    if (totalNodesInCurrentEvent >= CONFIG.DEPTH_FIRST_NODE_BUDGET) {
      const preview = cleanedText ? cleanedText.substring(0, 50) : '(no text)'
      const choiceCount = choices.length
      console.warn(
        `  ⚠️  Event "${eventName}" reached depth-first node limit (${CONFIG.DEPTH_FIRST_NODE_BUDGET}) at depth ${depth}`
      )
      console.warn(`      Text: "${preview}${cleanedText && cleanedText.length > 50 ? '...' : ''}"`)
      console.warn(`      Choices: ${choiceCount}`)
      return null
    }
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

  // EARLY DEDUPLICATION: DIALOGUE MENU DETECTION
  // For events with dialogue menu patterns (like Rathael), detect when we're back
  // at a menu with the same set of questions available and create a ref to prevent
  // hitting the node limit during tree building. Without this, factorial explosion
  // causes incomplete trees. Post-processing collapseDialogueMenus() further simplifies.
  const isDialogueMenuEvent = DIALOGUE_MENU_EVENTS.includes(eventName)
  if (isDialogueMenuEvent && isDialogueMenuPattern(choices)) {
    const menuSignature = createDialogueMenuSignature(choices)

    // Check if we've seen this exact menu state before
    if (dialogueMenuStates.has(menuSignature)) {
      const originalNodeId = dialogueMenuStates.get(menuSignature)
      totalNodesInCurrentEvent++

      // Create ref node pointing to the first occurrence of this menu
      return createNode({
        id: generateNodeId(),
        text: cleanedText,
        type: type,
        effects: effects,
        numContinues: numContinues,
        ref: originalNodeId,
      })
    }

    // First time seeing this menu state - store it
    dialogueMenuStates.set(menuSignature, nodeId)
  }

  // EARLY DEDUPLICATION: PATH CONVERGENCE DETECTION
  // Detects when we reach the same node (same text + choices) via different paths
  // This is like mini-dedup during tree building - prevents re-exploring identical branches
  // ONLY enabled for events in PATH_CONVERGENCE_EVENTS whitelist (events that need it to parse successfully)
  let convergenceSignature = null
  const enableEarlyDedupForThisEvent =
    PATH_CONVERGENCE_EVENTS.includes(eventName)
  if (enableEarlyDedupForThisEvent && cleanedText && choices.length >= CONFIG.PATH_CONVERGENCE_DEDUP_MIN_CHOICES) {
    // Create signature based on text + sorted choice labels
    const choiceLabels = choices
      .map((c) => extractChoiceMetadata(c.text).cleanedText)
      .sort()
      .join('|')
    convergenceSignature = `${cleanedText}::${choiceLabels}`

    // Check if we've seen this exact node state before (same text + same choices available)
    if (pathConvergenceStates.has(convergenceSignature)) {
      const originalNodeId = pathConvergenceStates.get(convergenceSignature)
      totalNodesInCurrentEvent++

      // Create ref node pointing to the first occurrence of this node state
      return createNode({
        id: generateNodeId(),
        text: cleanedText,
        type: type,
        effects: effects,
        numContinues: numContinues,
        ref: originalNodeId,
      })
    }

    // NOTE: We store the signature AFTER building children (see end of function)
    // This prevents race conditions where another path reaches the same node
    // before we've finished building this one's children
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

  // Store early dedup signature AFTER building children
  // This ensures other paths won't create refs to incomplete nodes
  // Only store if we actually have children (to avoid matching incomplete nodes)
  if (convergenceSignature && children.length > 0) {
    pathConvergenceStates.set(convergenceSignature, nodeId)
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
 * Detect if choices form a "dialogue menu" pattern (multiple questions you can ask in any order)
 * Returns true if we have 5+ choices where most end with '?'
 */
function isDialogueMenuPattern(choices) {
  if (choices.length < 5) return false

  const questionChoices = choices.filter((choice) => {
    const { cleanedText } = extractChoiceMetadata(choice.text)
    return cleanedText && cleanedText.trim().endsWith('?')
  })

  // If 70% or more of choices are questions, it's a dialogue menu
  return questionChoices.length >= Math.ceil(choices.length * 0.7)
}

/**
 * Create a signature for a dialogue menu based on the sorted set of question choices
 * This allows us to detect when we're back at the "same menu" with the same questions available
 */
function createDialogueMenuSignature(choices) {
  const questionLabels = choices
    .map((choice) => extractChoiceMetadata(choice.text).cleanedText)
    .filter((text) => text && text.trim().endsWith('?'))
    .sort()
    .join('|')

  return `MENU:${questionLabels}`
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
 */
function findInvalidRefsInTree(rootNode, nodeMap) {
  const invalidRefs = []
  function checkRefs(node) {
    if (!node) return
    if (node.ref !== undefined && !nodeMap.has(node.ref)) {
      invalidRefs.push({ nodeId: node.id, refTarget: node.ref })
    }
    if (node.children) {
      node.children.forEach((child) => checkRefs(child))
    }
  }
  checkRefs(rootNode)
  return invalidRefs
}

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
        examples: invalidRefs.slice(0, 3), // Show first 3 examples
      })
    }
  })

  if (totalInvalidRefs > 0) {
    console.log(`  ⚠️  Found ${totalInvalidRefs} invalid refs across ${eventsWithInvalidRefs.length} events`)
    if (CONFIG.VERBOSE_LOGGING) {
      console.log('\n  Events with invalid refs:')
      eventsWithInvalidRefs.forEach(({ name, invalidRefs, examples }) => {
        console.log(`    - "${name}": ${invalidRefs} invalid refs`)
        examples.forEach(({ nodeId, refTarget }) => {
          console.log(`        Node ${nodeId} -> ${refTarget} (target not found)`)
        })
      })
    }
  } else {
    console.log(`  ✅ No invalid refs found`)
  }
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
    const { name, type, artwork, text, caption } = event

    // Use caption as name if it exists, otherwise use name
    const displayName = caption || name

    if (!text) {
      if (CONFIG.VERBOSE_LOGGING) {
        console.log(`  ⊘  [${i + 1}/${events.length}] Skipping "${displayName}" (no text content)`)
      }
      emptyCount++
      continue
    }

    if (CONFIG.VERBOSE_LOGGING) {
      console.log(`  → [${i + 1}/${events.length}] Parsing "${displayName}" (type ${type})...`)
    }

    const rootNode = parseInkStory(text, displayName)

    if (rootNode) {
      eventTrees.push({
        name: displayName,
        type,
        artwork: artwork || '',
        rootNode,
      })
      successCount++
      if (CONFIG.VERBOSE_LOGGING) {
        console.log(`    ✓ Success (${countNodes(rootNode)} nodes)`)
      }
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

  if (CONFIG.VERBOSE_LOGGING && eventsWithDedupe.length > 0) {
    console.log(`\n  Events with deduplication:`)
    eventsWithDedupe.forEach(({ name, duplicates, nodesRemoved }) => {
      console.log(`    - "${name}": ${duplicates} duplicates, ${nodesRemoved} nodes removed`)
    })
  }

  // Collapse dialogue menu question orderings
  console.log('\n🗂️  Collapsing dialogue menus...')
  const { totalCollapsed, eventsWithCollapsed } = collapseDialogueMenus(eventTrees)
  console.log(`  Collapsed ${totalCollapsed} dialogue menu patterns`)

  if (eventsWithCollapsed.length > 0) {
    console.log(`  Events with collapsed menus:`)
    eventsWithCollapsed.forEach(({ name, nodesBefore, nodesAfter, reduction }) => {
      console.log(`    - "${name}": ${nodesBefore} → ${nodesAfter} nodes (${reduction}% reduction)`)
    })
  }

  console.log('\n🔗 Converting sibling and SIMPLE cousin refs to refChildren...')
  const { totalConversions, eventsWithConversions } = convertSiblingAndCousinRefsToRefChildren(eventTrees)
  console.log(`  Converted ${totalConversions} sibling refs`)

  if (CONFIG.VERBOSE_LOGGING && eventsWithConversions.length > 0) {
    console.log(`\n  Events with conversions:`)
    eventsWithConversions.forEach(({ name, conversions }) => {
      console.log(`    - "${name}": ${conversions} sibling refs converted`)
    })
  }

  checkInvalidRefs(eventTrees)

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
  if (CONFIG.VERBOSE_LOGGING) {
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
        // - The original node has a ref -> keep the original type (it's a ref node)
        // - The original node had no children -> 'end'
        // - The original node was 'choice' or 'dialogue' -> 'dialogue'
        // - Otherwise -> keep the original type, BUT warn!
        const hasChildren = child.children && child.children.length > 0
        const hasRef = child.ref !== undefined
        let outcomeType
        if (child.type === 'combat') {
          outcomeType = 'combat'
        } else if (hasRef) {
          // Preserve the type for ref nodes (they don't have children, but they're not end nodes)
          outcomeType = child.type
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
          ref: child.ref, // Preserve ref field!
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

  // Build a set of all node IDs that are referenced by other nodes
  // AND their descendants - these should not be deduplicated because other nodes depend on them
  // Note: This protection is primarily for refs created by path convergence detection
  // (early dedup), which only applies to events in PATH_CONVERGENCE_EVENTS whitelist.
  const refTargets = new Set()
  const protectedNodes = new Set()

  // First, collect all direct ref targets
  for (const node of allNodes) {
    if (node.ref !== undefined) {
      refTargets.add(node.ref)
    }
  }

  // Then, mark all ref targets and their descendants as protected
  function markDescendantsAsProtected(node) {
    protectedNodes.add(node.id)
    if (node.children) {
      node.children.forEach((child) => markDescendantsAsProtected(child))
    }
  }

  refTargets.forEach((targetId) => {
    const targetNode = allNodes.find((n) => n.id === targetId)
    if (targetNode) {
      markDescendantsAsProtected(targetNode)
    }
  })

  // Process nodes in breadth-first order (shallowest first)
  for (const node of allNodes) {
    if (!node.children || node.children.length === 0) continue
    if (node.ref) continue // Skip nodes that are already references
    if (protectedNodes.has(node.id)) continue // Skip nodes that are ref targets or their descendants

    // Check if this subtree is large enough to deduplicate
    const subtreeSize = countNodes(node)
    if (subtreeSize >= CONFIG.FINAL_DEDUP_MIN_SUBTREE_SIZE) {
      // Create a simple signature based on node structure
      const signature = JSON.stringify({
        numChildren: node.children.length,
        childrenData: node.children.map((child) => ({
          text: child.text,
          choiceLabel: child.choiceLabel,
          type: child.type,
          requirements: child.requirements,
          effects: child.effects,
          ref: child.ref, // Include ref in signature to avoid merging nodes with different refs
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
 * Collapse dialogue menus
 *
 * For nodes that have multiple question choices (ending with "?"), this function:
 * 1. Detects when all/most children are question choices
 * 2. Keeps the question choices separate (preserves original choice labels)
 * 3. For questions with only one child, replaces that child's subtree with a ref back to the menu
 *
 * This eliminates the factorial explosion that occurs when users can ask
 * questions in any order (e.g., 9 questions = 9! = 362,880 orderings)
 */
function collapseDialogueMenusInTree(rootNode) {
  let collapsedCount = 0

  function traverse(node) {
    if (!node || !node.children) return

    // Check if this node is a dialogue menu (4+ children where 75%+ are questions)
    const children = node.children
    if (children.length < 4) {
      // Not enough choices to be a menu - recurse to children
      children.forEach(child => traverse(child))
      return
    }

    const questionChildren = children.filter(child => {
      const label = child.choiceLabel || ''
      return label.trim().endsWith('?')
    })

    const questionPercentage = questionChildren.length / children.length
    if (questionPercentage < 0.75) {
      // Not enough questions to be a dialogue menu - recurse to children
      children.forEach(child => traverse(child))
      return
    }

    // This is a dialogue menu! Collapse it.
    questionChildren.forEach(questionChild => {
      // If this question choice has exactly one child, replace its subtree with a ref
      if (questionChild.children && questionChild.children.length === 1) {
        const originalChild = questionChild.children[0]

        questionChild.children = [createNode({
          id: originalChild.id,
          text: originalChild.text,
          type: originalChild.type,
          effects: originalChild.effects,
          numContinues: originalChild.numContinues,
          ref: node.id, // Ref back to the menu node
        })]
      }
    })

    collapsedCount++

    const nonQuestionChildren = children.filter(child => !questionChildren.includes(child))

    nonQuestionChildren.forEach(child => traverse(child))
  }

  traverse(rootNode)
  return collapsedCount
}

/**
 * Collapse dialogue menus across all event trees
 */
function collapseDialogueMenus(eventTrees) {
  let totalCollapsed = 0
  const eventsWithCollapsed = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) {
      return
    }

    const nodesBefore = countNodes(tree.rootNode)
    const collapsed = collapseDialogueMenusInTree(tree.rootNode)
    const nodesAfter = countNodes(tree.rootNode)

    if (collapsed > 0) {
      const reduction = Math.round(((nodesBefore - nodesAfter) / nodesBefore) * 100)
      eventsWithCollapsed.push({
        name: tree.name,
        nodesBefore,
        nodesAfter,
        reduction,
      })
      totalCollapsed += collapsed
    }
  })

  return { totalCollapsed, eventsWithCollapsed }
}

/**
 * Convert sibling refs to refChildren structure
 *
 * When a node has a ref pointing to a sibling, this function:
 * 1. Moves the node to be immediately after its ref target
 * 2. Replaces the `ref` field with `refChildren` containing the target's children IDs
 *
 * Example transformation:
 * Before: [A(id:1, children:[10,11]), B(id:2), C(id:3, ref:1)]
 * After:  [A(id:1, children:[10,11]), C(id:3, refChildren:[10,11]), B(id:2)]
 */
function convertSiblingRefsInTree(rootNode) {
  let conversionsCount = 0

  function traverse(node) {
    if (!node || !node.children || node.children.length === 0) return

    // Handle sibling refs
    const reorderedChildren = []
    const processed = new Set()

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]

      if (processed.has(child.id)) continue

      // Add this child to the reordered list
      reorderedChildren.push(child)
      processed.add(child.id)

      // Check if any unprocessed siblings have refs pointing to this child (sibling ref)
      for (let j = 0; j < node.children.length; j++) {
        if (processed.has(node.children[j].id)) continue

        const potentialRefNode = node.children[j]

        // Check if this node has a ref pointing to the current child (sibling)
        if (potentialRefNode.ref !== undefined && potentialRefNode.ref === child.id) {
          // This is a sibling ref! Convert it.

          // Get the target's children IDs
          const refChildrenIds = child.children ? child.children.map(c => c.id) : []

          // Create new node with refChildren instead of ref
          const convertedNode = {
            ...potentialRefNode,
            refChildren: refChildrenIds,
          }

          // Remove the ref field
          delete convertedNode.ref

          // Verify that this node doesn't have children (as per requirement)
          if (potentialRefNode.children && potentialRefNode.children.length > 0) {
            console.warn(`  ⚠️  Node ${potentialRefNode.id} has both ref and children - this shouldn't happen!`)
          }

          // Add the converted node immediately after its target
          reorderedChildren.push(convertedNode)
          processed.add(potentialRefNode.id)
          conversionsCount++
        }
      }
    }

    // Update the parent's children with the reordered list
    node.children = reorderedChildren

    // Recursively process this child's subtree
    for (const child of node.children) {
      traverse(child)
    }
  }

  traverse(rootNode)
  return conversionsCount
}

/**
 * Convert SIMPLE cousin refs to refChildren structure
 *
 * When a node has a ref pointing to a cousin (and both are single children):
 * 1. Finds the common ancestor where the parents of the ref node and target node are siblings
 * 2. Ensures those parent nodes are adjacent at that ancestor level
 * 3. Replaces the `ref` field with `refChildren` containing the target's children IDs
 *
 * This handles cousin refs at ANY depth by walking up the tree to find where the parents
 * become siblings. For example, if A->B->C and D->E->F(ref:C), it finds that B and E's
 * parents (A and D) are siblings at the root level, and reorders A and D to be adjacent.
 *
 * Example transformations:
 * Direct cousin ref:
 * Before: [A(id:1, children:[C]), B(id:2, children:[D]), C(id:3, children:[E,F]), D(id:4, ref:3)]
 * After:  [A(id:1, children:[C]), B(id:2, children:[D]), C(id:3, children:[E,F]), D(id:4, refChildren:[E,F])]
 *
 * Deeper cousin ref:
 * Before: [A(id:1, children:[B]), B(id:2, children:[C]), C(id:3, children:[G]), D(id:4, children:[E]), E(id:5, children:[F]), F(id:6, ref:3)]
 * After:  [A(id:1, children:[B]), D(id:4, children:[E]), B(id:2, children:[C]), E(id:5, children:[F]), C(id:3, children:[G]), F(id:6, refChildren:[G])]
 *        (A and D are reordered so B and E are adjacent, making C and F cousins)
 */
function convertCousinRefsInTree(rootNode, eventName) {
  // Check blacklist - skip events that break with this pass
  if (COUSIN_REF_BLACKLIST.includes(eventName)) {
    return 0
  }

  let conversionsCount = 0

  // Build parent map and node map
  const parentMap = new Map() // nodeId -> parent node
  const nodeMap = new Map()   // nodeId -> node

  function buildMaps(node, parent = null) {
    if (!node) return
    nodeMap.set(node.id, node)
    if (parent) {
      parentMap.set(node.id, parent)
    }
    if (node.children) {
      node.children.forEach(child => buildMaps(child, node))
    }
  }

  buildMaps(rootNode)

  // Find all cousin refs in the tree and process them
  function findAllCousinRefs() {
    const allCousinRefs = []

    // Find all nodes that have refs
    for (const [nodeId, refNode] of nodeMap.entries()) {
      if (refNode.ref === undefined) continue

      const refNodeParent = parentMap.get(nodeId)
      if (!refNodeParent) continue

      // Find the target node being referenced
      const targetNode = nodeMap.get(refNode.ref)
      if (!targetNode) continue

      const targetNodeParent = parentMap.get(targetNode.id)
      if (!targetNodeParent) continue

      // Skip if same parent (sibling ref, already handled)
      if (refNodeParent.id === targetNodeParent.id) continue

      // Find the common ancestor where the parents of refNode and targetNode are siblings
      // We need to check if refNodeParent and targetNodeParent are siblings (direct children of same node)
      let commonAncestor = null

      // Get the grandparents (parents of the parents)
      const refParentParent = parentMap.get(refNodeParent.id)
      const targetParentParent = parentMap.get(targetNodeParent.id)

      if (refParentParent && targetParentParent) {
        if (refParentParent.id === targetParentParent.id) {
          // The parents themselves are siblings (direct children case)
          // Check if they are direct children
          if (refParentParent.children) {
            const refParentIsChild = refParentParent.children.some(c => c.id === refNodeParent.id)
            const targetParentIsChild = refParentParent.children.some(c => c.id === targetNodeParent.id)
            if (refParentIsChild && targetParentIsChild) {
              commonAncestor = refParentParent
            }
          }
        } else {
          // The parents are cousins - check if their parents (grandparents) are siblings
          // Walk up the tree to find where the grandparents become siblings
          let refGrandparentCurrent = refParentParent
          let targetGrandparentCurrent = targetParentParent

          // Check all ancestors until we find where they're siblings
          while (refGrandparentCurrent && targetGrandparentCurrent) {
            const refGrandparentParent = parentMap.get(refGrandparentCurrent.id)
            const targetGrandparentParent = parentMap.get(targetGrandparentCurrent.id)

            if (refGrandparentParent && targetGrandparentParent &&
                refGrandparentParent.id === targetGrandparentParent.id) {
              // Found common ancestor - verify grandparents are direct children
              if (refGrandparentParent.children) {
                const refGrandparentIsChild = refGrandparentParent.children.some(c => c.id === refGrandparentCurrent.id)
                const targetGrandparentIsChild = refGrandparentParent.children.some(c => c.id === targetGrandparentCurrent.id)
                if (refGrandparentIsChild && targetGrandparentIsChild) {
                  commonAncestor = refGrandparentParent
                  break
                }
              }
            }

            refGrandparentCurrent = refGrandparentParent
            targetGrandparentCurrent = targetGrandparentParent
          }
        }
      }

      if (commonAncestor) {
        // Check if both nodes are single children
        const refNodeIsSingleChild = refNodeParent.children && refNodeParent.children.length === 1
        const targetNodeIsSingleChild = targetNodeParent.children && targetNodeParent.children.length === 1

        if (refNodeIsSingleChild && targetNodeIsSingleChild) {
          allCousinRefs.push({
            refNode,
            refNodeParent,
            targetNode,
            targetNodeParent,
            commonAncestor,
          })
        }
      }
    }

    return allCousinRefs
  }

  // Group cousin refs by their common ancestor
  const allCousinRefs = findAllCousinRefs()
  const cousinRefsByAncestor = new Map()

  for (const cousinRef of allCousinRefs) {
    const ancestorId = cousinRef.commonAncestor.id
    if (!cousinRefsByAncestor.has(ancestorId)) {
      cousinRefsByAncestor.set(ancestorId, [])
    }
    cousinRefsByAncestor.get(ancestorId).push(cousinRef)
  }

  // Process each ancestor level
  function handleCousinRefsAtAllDepths(node) {
    if (!node || !node.children || node.children.length === 0) return

    const cousinRefs = cousinRefsByAncestor.get(node.id) || []

    // Reorder grandparents so that cousin refs have adjacent parents
    if (cousinRefs.length > 0) {
      const grandparentAdjacency = new Map() // targetGrandparent -> refGrandparent (should be adjacent)

      for (const cousinRef of cousinRefs) {
        // Get the grandparents (parents of the parents)
        const targetGrandparent = parentMap.get(cousinRef.targetNodeParent.id)
        const refGrandparent = parentMap.get(cousinRef.refNodeParent.id)

        if (targetGrandparent && refGrandparent && targetGrandparent.id !== refGrandparent.id) {
          // Ensure refGrandparent comes right after targetGrandparent
          const existing = grandparentAdjacency.get(targetGrandparent.id)
          if (!existing || existing.id !== refGrandparent.id) {
            grandparentAdjacency.set(targetGrandparent.id, refGrandparent)
          }
        }
      }

      if (grandparentAdjacency.size > 0) {
        const reordered = []
        const processedGrandparents = new Set()

        for (const grandparent of node.children) {
          if (processedGrandparents.has(grandparent.id)) continue

          reordered.push(grandparent)
          processedGrandparents.add(grandparent.id)

          // Check if this grandparent needs its ref grandparent adjacent
          const refGrandparent = grandparentAdjacency.get(grandparent.id)
          if (refGrandparent && !processedGrandparents.has(refGrandparent.id)) {
            // Find refGrandparent in the original array and add it next
            const refGrandparentIndex = node.children.findIndex(p => p.id === refGrandparent.id)
            if (refGrandparentIndex !== -1) {
              reordered.push(node.children[refGrandparentIndex])
              processedGrandparents.add(refGrandparent.id)
            }
          }
        }

        // Add any remaining unprocessed grandparents
        for (const grandparent of node.children) {
          if (!processedGrandparents.has(grandparent.id)) {
            reordered.push(grandparent)
          }
        }

        node.children = reordered
      }

      // Now convert cousin refs to refChildren
      for (const cousinRef of cousinRefs) {
        const refChildrenIds = cousinRef.targetNode.children ? cousinRef.targetNode.children.map(c => c.id) : []
        cousinRef.refNode.refChildren = refChildrenIds
        delete cousinRef.refNode.ref
        conversionsCount++
      }
    }

    // Recursively process children to handle cousin refs at deeper levels
    for (const child of node.children) {
      handleCousinRefsAtAllDepths(child)
    }
  }

  handleCousinRefsAtAllDepths(rootNode)

  return conversionsCount
}

/**
 * Convert non-single-child cousin refs to refChildren structure
 *
 * Special case: When a node has a ref pointing to a cousin, but the ref node is NOT a single child
 * (its parent has multiple children). In this case, we reorder siblings in BOTH parents:
 * 1. Reorder siblings in target node's parent: place target nodes last
 * 2. Reorder siblings in ref node's parent: place ref nodes first
 * This positions ref nodes and target nodes to be adjacent to each other, then converts ref to refChildren.
 *
 * Example transformation:
 * Before: A(children:[C,D]), B(children:[E,F]), C(children:[G]), D, E, F(ref:C)
 * After:  A(children:[D,C]), B(children:[F,E]), D, C(children:[G]), F(refChildren:[G]), E
 *        (C moved to last in A, F moved to first in B, making them adjacent)
 *
 */
function convertNonSingleChildCousinRefsInTree(rootNode) {
  let conversionsCount = 0

  // Build parent map and node map
  const parentMap = new Map() // nodeId -> parent node
  const nodeMap = new Map()   // nodeId -> node

  function buildMaps(node, parent = null) {
    if (!node) return
    nodeMap.set(node.id, node)
    if (parent) {
      parentMap.set(node.id, parent)
    }
    if (node.children) {
      node.children.forEach(child => buildMaps(child, node))
    }
  }

  buildMaps(rootNode)

  // Find all cousin refs where ref node is not a single child
  function findAllNonSingleChildCousinRefs() {
    const allCousinRefs = []

    // Find all nodes that have refs
    for (const [nodeId, refNode] of nodeMap.entries()) {
      if (refNode.ref === undefined) continue

      const refNodeParent = parentMap.get(nodeId)
      if (!refNodeParent) continue

      // Skip if ref node is a single child (handled by convertCousinRefsInTree)
      if (refNodeParent.children && refNodeParent.children.length === 1) continue

      // Find the target node being referenced
      const targetNode = nodeMap.get(refNode.ref)
      if (!targetNode) continue

      const targetNodeParent = parentMap.get(targetNode.id)
      if (!targetNodeParent) continue

      // Skip if same parent (sibling ref, already handled)
      if (refNodeParent.id === targetNodeParent.id) continue

      // Find the common ancestor where the parents of refNode and targetNode are siblings
      let commonAncestor = null

      // Get the grandparents (parents of the parents)
      const refParentParent = parentMap.get(refNodeParent.id)
      const targetParentParent = parentMap.get(targetNodeParent.id)

      if (refParentParent && targetParentParent) {
        if (refParentParent.id === targetParentParent.id) {
          // The parents themselves are siblings (direct children case)
          // Check if they are direct children
          if (refParentParent.children) {
            const refParentIsChild = refParentParent.children.some(c => c.id === refNodeParent.id)
            const targetParentIsChild = refParentParent.children.some(c => c.id === targetNodeParent.id)
            if (refParentIsChild && targetParentIsChild) {
              commonAncestor = refParentParent
            }
          }
        } else {
          // The parents are cousins - check if their parents (grandparents) are siblings
          // Walk up the tree to find where the grandparents become siblings
          let refGrandparentCurrent = refParentParent
          let targetGrandparentCurrent = targetParentParent

          // Check all ancestors until we find where they're siblings
          while (refGrandparentCurrent && targetGrandparentCurrent) {
            const refGrandparentParent = parentMap.get(refGrandparentCurrent.id)
            const targetGrandparentParent = parentMap.get(targetGrandparentCurrent.id)

            if (refGrandparentParent && targetGrandparentParent &&
                refGrandparentParent.id === targetGrandparentParent.id) {
              // Found common ancestor - verify grandparents are direct children
              if (refGrandparentParent.children) {
                const refGrandparentIsChild = refGrandparentParent.children.some(c => c.id === refGrandparentCurrent.id)
                const targetGrandparentIsChild = refGrandparentParent.children.some(c => c.id === targetGrandparentCurrent.id)
                if (refGrandparentIsChild && targetGrandparentIsChild) {
                  commonAncestor = refGrandparentParent
                  break
                }
              }
            }

            refGrandparentCurrent = refGrandparentParent
            targetGrandparentCurrent = targetGrandparentParent
          }
        }
      }

      if (commonAncestor) {
        // This is a cousin ref where ref node is not a single child
        allCousinRefs.push({
          refNode,
          refNodeParent,
          targetNode,
          targetNodeParent,
          commonAncestor,
        })
      }
    }

    return allCousinRefs
  }

  const allCousinRefs = findAllNonSingleChildCousinRefs()

  // Group cousin refs by both the ref node's parent and target node's parent
  // We need to reorder siblings in both parents
  const cousinRefsByRefParent = new Map()
  const cousinRefsByTargetParent = new Map()

  for (const cousinRef of allCousinRefs) {
    const refParentId = cousinRef.refNodeParent.id
    const targetParentId = cousinRef.targetNodeParent.id

    if (!cousinRefsByRefParent.has(refParentId)) {
      cousinRefsByRefParent.set(refParentId, [])
    }
    cousinRefsByRefParent.get(refParentId).push(cousinRef)

    if (!cousinRefsByTargetParent.has(targetParentId)) {
      cousinRefsByTargetParent.set(targetParentId, [])
    }
    cousinRefsByTargetParent.get(targetParentId).push(cousinRef)
  }

  // First, reorder siblings in target node's parent: place target nodes last
  // This positions them to be closest to ref nodes (which will be first in their parent)
  cousinRefsByTargetParent.forEach((cousinRefs, parentId) => {
    const parent = nodeMap.get(parentId)
    if (!parent || !parent.children) return

    const targetNodes = new Set(cousinRefs.map(cr => cr.targetNode.id))
    const targetNodeList = []
    const otherSiblings = []

    // Separate target nodes from other siblings, preserving original order within each group
    for (const sibling of parent.children) {
      if (targetNodes.has(sibling.id)) {
        targetNodeList.push(sibling)
      } else {
        otherSiblings.push(sibling)
      }
    }

    // Place target nodes last (so they're closest to ref nodes)
    const reordered = [...otherSiblings, ...targetNodeList]

    // Update parent's children
    parent.children = reordered
  })

  // Then, reorder siblings in ref node's parent: place ref nodes first
  cousinRefsByRefParent.forEach((cousinRefs, parentId) => {
    const parent = nodeMap.get(parentId)
    if (!parent || !parent.children) return

    const refNodes = new Set(cousinRefs.map(cr => cr.refNode.id))
    const refNodeList = []
    const otherSiblings = []

    // Separate ref nodes from other siblings, preserving original order within each group
    for (const sibling of parent.children) {
      if (refNodes.has(sibling.id)) {
        refNodeList.push(sibling)
      } else {
        otherSiblings.push(sibling)
      }
    }

    // Place ref nodes first (so they're closest to target nodes)
    const reordered = [...refNodeList, ...otherSiblings]

    // Update parent's children
    parent.children = reordered

    // Convert refs to refChildren
    for (const cousinRef of cousinRefs) {
      const refChildrenIds = cousinRef.targetNode.children ? cousinRef.targetNode.children.map(c => c.id) : []
      cousinRef.refNode.refChildren = refChildrenIds
      delete cousinRef.refNode.ref
      conversionsCount++
    }
  })

  return conversionsCount
}

/**
 * Convert sibling and SIMPLE cousin refs to refChildren structure
 *
 * This is a wrapper function that calls convertSiblingRefsInTree, convertCousinRefsInTree,
 * and convertNonSingleChildCousinRefsInTree in separate passes, as they handle different
 * types of refs and need to be processed separately.
 */
function convertSiblingAndCousinRefsToRefChildrenInTree(rootNode, eventName) {
  const siblingConversions = convertSiblingRefsInTree(rootNode)
  const cousinConversions = convertCousinRefsInTree(rootNode, eventName)
  const nonSingleChildCousinConversions = convertNonSingleChildCousinRefsInTree(rootNode)
  return siblingConversions + cousinConversions + nonSingleChildCousinConversions
}

/**
 * Convert sibling refs to refChildren across all event trees
 */
function convertSiblingAndCousinRefsToRefChildren(eventTrees) {
  let totalConversions = 0
  const eventsWithConversions = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) {
      return
    }

    const conversions = convertSiblingAndCousinRefsToRefChildrenInTree(tree.rootNode, tree.name)

    if (conversions > 0) {
      eventsWithConversions.push({
        name: tree.name,
        conversions,
      })
      totalConversions += conversions
    }
  })

  return { totalConversions, eventsWithConversions }
}

/**
 * Post-processing: Deduplicate structurally identical subtrees across all event trees
 * This catches remaining duplicates that weren't detected during tree building
 */
function deduplicateAllTrees(eventTrees) {
  let totalDuplicates = 0
  let totalNodesRemoved = 0
  const eventsWithDedupe = []

  eventTrees.forEach((tree) => {
    if (!tree.rootNode) {
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
