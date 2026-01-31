/* eslint-disable */
const fs = require('fs')
const path = require('path')
const { Story } = require('inkjs')
const { buildIdToNameMapping } = require('../shared/card-data.js')

// Suppress inkjs version warnings (our events are v21, inkjs supports v20 but works fine)
const originalWarn = console.warn
console.warn = (...args) => {
  if (args[0]?.includes('Version of ink')) return
  originalWarn.apply(console, args)
}

/**
 * Script to parse Ink JSON from events and generate hierarchical tree structures
 * using the official inkjs runtime for accurate parsing,
 * plus several home-made optimization passes.
 */

const EVENTS_FILE = path.join(__dirname, '../data/events.json')
const OUTPUT_FILE = path.join(__dirname, '../../src/codex/data/event-trees.json')
const EVENT_ALTERATIONS = require('./event-alterations.js')
const { DEFAULT_NODE_BLACKLIST, OPTIMIZATION_PASS_CONFIG, CONFIG } = require('./configs.js')

const RANDOM_KEYWORD = '«random»'

// Enables detailed logging for a specific event, when provided.
// const DEBUG_EVENT_NAME = 'Frozen Heart'
const DEBUG_EVENT_NAME = ''

let nodeIdCounter = 0
let totalNodesInCurrentEvent = 0
let hasResetForDepthFirst = false // Track if we've reset the counter for this event
let pathConvergenceStates = new Map() // Track path convergence for early dedup (text + choices)
let hubChoiceSnapshots = new Map() // Track hub choice snapshots: eventName -> { hubNodeId, choiceLabels: Set, threshold }
let dialogueMenuHubIdsByEventName = new Map() // eventName -> hubNodeId (for debugging post-processing)

/**
 * Generate a unique node ID (integer, unique per event)
 */
function generateNodeId() {
  return nodeIdCounter++
}

/**
 * Detect random value assignments in Ink JSON
 * Returns a map of variable names to an array of their random ranges: { varName: [{ min, max }, ...] }
 * Multiple ranges per variable are supported (e.g., for branching paths with different random ranges)
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
        for (let i = 0; i <= node.length - 6; i++) {
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

            // Store all ranges for this variable (not just the last one)
            if (!randomVars.has(varName)) {
              randomVars.set(varName, [])
            }

            // Only add if this exact range doesn't already exist
            const ranges = randomVars.get(varName)
            const isDuplicate = ranges.some((r) => r.min === min && r.max === max)
            if (!isDuplicate) {
              ranges.push({ min, max })
            }
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
 * Detect knot definitions in Ink JSON root[2]
 * Knots are named sections of story that can be called dynamically by game commands
 * Returns a map of knot names to their content arrays
 */
function detectKnotDefinitions(inkJson) {
  const knots = new Map()

  // Knot definitions are typically at root[2] (root[0] is main flow, root[1] is "done", root[2] is knots)
  if (Array.isArray(inkJson.root) && inkJson.root.length > 2) {
    const definitions = inkJson.root[2]

    if (typeof definitions === 'object' && definitions !== null && !Array.isArray(definitions)) {
      Object.entries(definitions).forEach(([knotName, knotBody]) => {
        // Skip metadata keys that start with #
        if (knotName.startsWith('#')) return

        knots.set(knotName, knotBody)
      })
    }
  }

  return knots
}

/**
 * Parse knot content directly from Ink JSON structure
 * Returns a node representing the knot's outcome
 */
function parseKnotContentManually(knotBody, randomVars = new Map()) {
  if (!Array.isArray(knotBody)) return null

  let text = ''

  // Walk through knot body elements
  for (const element of knotBody) {
    if (typeof element === 'string') {
      // Remove ^ prefix if present (Ink text marker)
      const cleaned = element.startsWith('^') ? element.substring(1) : element

      // Check if this is a command after removing ^
      if (cleaned.startsWith('>>>>') || cleaned.startsWith('>>>')) {
        // Effect/command - add with newline separator to ensure proper extraction
        text += '\n' + cleaned
      } else if (cleaned === '\n' || element === '\n') {
        // Preserve newlines from original Ink
        text += '\n'
      } else if (cleaned) {
        // Regular text content
        text += cleaned
      }
    }
    // Skip other Ink control structures (objects, arrays, etc.)
  }

  // Use existing extractEffects to parse the text
  const { effects: extractedEffects, cleanedText } = extractEffects(text)

  // Normalize GOLD/DAMAGE effects to "COMMAND: random [min - max]" when value is in a random range (cleanUpRandomValues post-pass will fix text)
  let effects = extractedEffects
  if (randomVars.size > 0 && extractedEffects.length > 0) {
    effects = extractedEffects.map((effect) => {
      const s = String(effect)
      const goldMatch = s.match(/^GOLD:\s*(\d+)$/i)
      if (goldMatch) {
        const value = parseInt(goldMatch[1], 10)
        const ranges = randomVars.get('gold')
        const r = ranges && ranges.find((range) => value >= range.min && value <= range.max)
        return r ? `GOLD: random [${r.min} - ${r.max}]` : effect
      }
      const damageMatch = s.match(/^DAMAGE:\s*(\d+)$/i)
      if (damageMatch) {
        const value = parseInt(damageMatch[1], 10)
        const ranges = randomVars.get('damage') || randomVars.get('Damage')
        const r = ranges && ranges.find((range) => value >= range.min && value <= range.max)
        return r ? `DAMAGE: random [${r.min} - ${r.max}]` : effect
      }
      return effect
    })
  }

  return createNode({
    id: generateNodeId(),
    text: cleanedText || ``,
    type: 'end',
    effects: effects.length > 0 ? effects : undefined,
  })
}

/**
 * Check if effects contain branching commands that trigger knot exploration
 * Returns the branching command name if found, null otherwise
 */
function detectBranchingCommand(effects) {
  if (!effects || effects.length === 0) return null

  // Known branching commands that trigger dynamic knot selection
  const branchingCommands = ['COLLECTOR']

  for (const effect of effects) {
    for (const cmd of branchingCommands) {
      if (effect.toUpperCase() === cmd) {
        return cmd
      }
    }
  }

  return null
}

/**
 * Parse function/knot definitions from Ink JSON and extract their return values
 * Returns a map of function names to their possible return values
 * Example: { "random": ["Recall", "Figmented", "Reliable", "Firecast", "Chain", "Memorized"] }
 */
function parseFunctionDefinitions(inkJson) {
  const functions = new Map()

  try {
    // Function definitions are typically in root[2] or similar top-level objects
    if (Array.isArray(inkJson.root) && inkJson.root.length > 2) {
      const definitions = inkJson.root[2]

      if (typeof definitions === 'object' && definitions !== null) {
        // Iterate through each potential function definition
        Object.entries(definitions).forEach(([functionName, functionBody]) => {
          // Skip special keys like '#f' and 'global decl'
          if (functionName.startsWith('#') || functionName === 'global decl') {
            return
          }

          // Extract return values from this function (may be empty for knots/navigation functions)
          const returnValues = extractReturnValues(functionBody)
          // Always add the function, even if no string returns detected
          // This allows us to track all functions for logging/debugging
          functions.set(functionName, returnValues)
        })
      }
    }
  } catch (error) {
    // Silently fail if parsing fails
  }

  return functions
}

/**
 * Helper function to extract string return values from a function body
 * Looks for pattern: ["ev", "str", "^ReturnValue", "/str", "/ev", "~ret"]
 */
function extractReturnValues(node, returnValues = []) {
  if (Array.isArray(node)) {
    // Look for return pattern: ["ev", "str", "^Value", "/str", "/ev", "~ret", ...]
    for (let i = 0; i < node.length - 5; i++) {
      if (
        node[i] === 'ev' &&
        node[i + 1] === 'str' &&
        typeof node[i + 2] === 'string' &&
        node[i + 2].startsWith('^') &&
        node[i + 3] === '/str' &&
        node[i + 4] === '/ev' &&
        node[i + 5] === '~ret'
      ) {
        // Extract the string value (remove leading ^)
        const value = node[i + 2].substring(1)
        if (value && !returnValues.includes(value)) {
          returnValues.push(value)
        }
      }
    }

    // Recursively traverse arrays
    node.forEach((item) => extractReturnValues(item, returnValues))
  } else if (typeof node === 'object' && node !== null) {
    // Recursively traverse objects
    Object.values(node).forEach((value) => extractReturnValues(value, returnValues))
  }

  return returnValues
}

/**
 * Detect function calls that assign to variables
 * Returns a map of variable names to their function name
 * Example: { "cardOne": "random", "cardTwo": "random", "cardThree": "random" }
 */
function detectFunctionCalls(inkJson) {
  const functionCalls = new Map()

  try {
    // Traverse the main story flow (root[0])
    if (Array.isArray(inkJson.root) && inkJson.root.length > 0) {
      traverseForFunctionCalls(inkJson.root[0], functionCalls)
    }
  } catch (error) {
    // Silently fail if parsing fails
  }

  return functionCalls
}

/**
 * Helper function to traverse and detect function call patterns
 * Pattern: ["ev", {"f()": "functionName"}, "/ev", {"VAR=": "varName"}]
 */
function traverseForFunctionCalls(node, functionCalls) {
  if (Array.isArray(node)) {
    // Look for pattern: ["ev", {"f()": "functionName"}, "/ev", {"VAR=": "varName", ...}]
    for (let i = 0; i < node.length - 3; i++) {
      if (
        node[i] === 'ev' &&
        typeof node[i + 1] === 'object' &&
        node[i + 1] !== null &&
        'f()' in node[i + 1] &&
        node[i + 2] === '/ev' &&
        typeof node[i + 3] === 'object' &&
        node[i + 3] !== null &&
        'VAR=' in node[i + 3]
      ) {
        const functionName = node[i + 1]['f()']
        const varName = node[i + 3]['VAR=']

        // Store the function call mapping (varName -> functionName)
        functionCalls.set(varName, functionName)
      }
    }

    // Continue traversing
    node.forEach((item) => traverseForFunctionCalls(item, functionCalls))
  } else if (typeof node === 'object' && node !== null) {
    Object.values(node).forEach((value) => traverseForFunctionCalls(value, functionCalls))
  }
}

/**
 * Create a node with consistent field ordering
 *
 * Field order: id, text, type, choiceLabel, requirements, effects, numContinues, ref, children
 * Optional fields are only included if they have values.
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
    pathConvergenceStates = new Map()
    hubChoiceSnapshots = new Map()

    // Parse ink JSON once for all analysis
    const inkJson = JSON.parse(inkJsonString)

    // Detect random variables before executing the story
    const randomVars = detectRandomVariables(inkJsonString)

    // Parse function definitions and detect function calls
    const functionDefinitions = parseFunctionDefinitions(inkJson)
    const functionCalls = detectFunctionCalls(inkJson)

    // Detect knot definitions (for events with dynamic branching like COLLECTOR)
    const knots = detectKnotDefinitions(inkJson)

    // Log detected random variables for debugging
    if (randomVars.size > 0) {
      const varList = Array.from(randomVars.entries())
        .map(([name, ranges]) => {
          if (ranges.length === 1) {
            return `${name}(${ranges[0].min}-${ranges[0].max})`
          } else {
            const rangeStr = ranges.map((r) => `${r.min}-${r.max}`).join(', ')
            return `${name}(${ranges.length} ranges: ${rangeStr})`
          }
        })
        .join(', ')
      if (eventName === DEBUG_EVENT_NAME) {
        console.log(`  📊 Random variables: ${varList}`)
      }
    }

    // Log function definitions and calls for all events (for review)
    if (
      (functionDefinitions.size > 0 || functionCalls.size > 0) &&
      eventName === DEBUG_EVENT_NAME
    ) {
      console.log(`  → Event "${eventName}" has functions:`)

      if (functionDefinitions.size > 0) {
        const funcList = Array.from(functionDefinitions.entries())
          .map(([name, values]) => {
            if (values.length === 0) {
              return `${name}(no returns detected)`
            } else if (values.length <= 3) {
              return `${name}(${values.join(', ')})`
            } else {
              return `${name}(${values.length} values: ${values.slice(0, 2).join(', ')}, ...)`
            }
          })
          .join(', ')
        console.log(`     🎲 Definitions: ${funcList}`)
      }

      if (functionCalls.size > 0) {
        const callList = Array.from(functionCalls.entries())
          .map(([varName, functionName]) => `${varName}=${functionName}()`)
          .join(', ')
        console.log(`     📞 Calls: ${callList}`)
      }
    }

    // Log detected knots for debugging
    if (knots.size > 0) {
      const knotList = Array.from(knots.keys()).join(', ')
      console.log(`  🔀 Event "${eventName}" has ${knots.size} knots: ${knotList}`)
    }

    const story = new Story(inkJsonString)

    // Build tree by exploring all possible paths
    const rootNode = buildTreeFromStory(
      story,
      eventName,
      new Set(),
      new Map(),
      0,
      '',
      [],
      new Map(),
      randomVars,
      functionDefinitions,
      functionCalls,
      knots
    )

    if (!rootNode) {
      console.warn(`  ⚠️  Event "${eventName}" produced empty tree`)
      return null
    }

    // Check if we hit the depth-first node limit
    // Note: This check happens after the tree is built, so it only detects if we hit
    // the limit during depth-first phase (counter was reset at transition)
    if (totalNodesInCurrentEvent >= CONFIG.DEPTH_FIRST_NODE_BUDGET) {
      console.warn(`  ⚠️  Event "${eventName}" hit depth-first node limit - tree may be incomplete`)
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
  randomVars = new Map(),
  functionDefinitions = new Map(),
  functionCalls = new Map(),
  knots = new Map()
) {
  // RESET node counter when transitioning from sibling-first to depth-first
  // This happens exactly ONCE when we first reach SIBLING_FIRST_DEPTH
  if (depth === CONFIG.SIBLING_FIRST_DEPTH && !hasResetForDepthFirst) {
    hasResetForDepthFirst = true
    totalNodesInCurrentEvent = 0
  }

  // Prevent infinite loops and excessive depth (check this early before collecting text)
  if (depth > CONFIG.MAX_DEPTH) {
    console.warn(
      `  ⚠️  Event "${eventName}" reached max depth (${CONFIG.MAX_DEPTH}) - truncating branch`
    )
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
      let line = story.Continue()
      continueCount++
      if (line && line.trim()) {
        // Normalize random GOLD/DAMAGE commands to "COMMAND: random [min - max]"
        // so extractEffects produces the right effect; cleanUpRandomValues post-pass fixes "N gold" / "N damage" in text
        if (randomVars.size > 0 && line.includes('>>>>')) {
          let modifiedLine = line
          const getRanges = (name) => randomVars.get(name) || randomVars.get(name.charAt(0).toUpperCase() + name.slice(1))
          const normalizeNumericEffect = (commandKey, varName) => {
            const re = new RegExp(`${commandKey}:(\\d+)`, 'gi')
            const ranges = getRanges(varName)
            if (!ranges) return
            for (const match of line.matchAll(re)) {
              const value = parseInt(match[1], 10)
              const r = ranges.find((range) => value >= range.min && value <= range.max)
              if (r) {
                const command = match[0].slice(0, match[0].indexOf(':'))
                modifiedLine = modifiedLine.replace(
                  new RegExp(`${command}:${value}\\b`, 'gi'),
                  `${command}:random [${r.min} - ${r.max}]`
                )
              }
            }
          }
          if (/GOLD:\d+/.test(line)) {
            normalizeNumericEffect('GOLD', 'gold')
          }
          if (/DAMAGE:\d+/.test(line)) {
            normalizeNumericEffect('DAMAGE', 'damage')
          }
          if (modifiedLine !== line) {
            text += (text ? '\n' : '') + modifiedLine.trim()
            continue
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

  // Choice+path-based hashing (used by multiple passes/debugging)
  const choiceLabels = OPTIMIZATION_PASS_CONFIG.CHOICE_AND_PATH_LOOP_DETECTION_ENABLED
    ? choices.map((c) => extractChoiceMetadata(c.text).cleanedText).join('|')
    : ''
  const currentStateHash = `${pathHash}_${choiceLabels}_${story.state.currentPathString || ''}`

  // Determine node type BEFORE cleaning (to detect combat/commands)
  const type = determineNodeType(text, choices.length === 0)

  // Extract effects from the beginning of text, then clean the rest
  const { effects, cleanedText } = extractEffects(text, functionDefinitions, functionCalls)

  // LOOP DETECTION & EARLY DEDUPLICATION:
  // Multiple strategies detect patterns during tree building and create ref nodes
  // to prevent infinite exploration and reduce redundant path exploration

  // 1. TEXT-BASED LOOP DETECTION (catches dialogue loops like The Ferryman)
  // Check if we've seen this exact text before in our exploration.
  // Skip when text contains RANDOM_KEYWORD so we don't collapse distinct branches that only differ by the random value.
  if (
    OPTIMIZATION_PASS_CONFIG.TEXT_LOOP_DETECTION_ENABLED &&
    cleanedText &&
    !cleanedText.includes(RANDOM_KEYWORD) &&
    textToNodeId.has(cleanedText)
  ) {
    if (eventName === DEBUG_EVENT_NAME) {
      console.log(`- TEXT-BASED LOOP detected at state hash: ${currentStateHash}`)
      console.log(`placing a ref marker on node: ${cleanedText}`)
    }

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
  // Skip when text contains RANDOM_KEYWORD so we don't collapse distinct branches that only differ by the random value.
  if (
    OPTIMIZATION_PASS_CONFIG.CHOICE_AND_PATH_LOOP_DETECTION_ENABLED &&
    (!cleanedText || !cleanedText.includes(RANDOM_KEYWORD)) &&
    visitedStates.has(currentStateHash)
  ) {
    if (eventName === DEBUG_EVENT_NAME) {
      console.log(`- CHOICE+PATH-BASED LOOP detected at state hash: ${currentStateHash}`)
      console.log(`placing a ref marker on node: ${cleanedText}`)
    }
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
      if (eventName === DEBUG_EVENT_NAME) {
        console.warn(
          `      Text: "${preview}${cleanedText && cleanedText.length > 50 ? '...' : ''}"`
        )
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

  // SPECIAL CASE: Check for branching commands BEFORE other early returns
  // Branching commands (like COLLECTOR) trigger exploration of knot definitions
  if (choices.length === 0) {
    const branchingCommand = detectBranchingCommand(effects)

    if (branchingCommand && knots.size > 0) {
      // This is a dynamic branching point - explore all knots as conditional branches
      console.log(
        `  🔀 [${eventName}] Found ${branchingCommand} command - exploring ${knots.size} knots`
      )

      const knotBranches = []
      knots.forEach((knotBody, knotName) => {
        const knotNode = parseKnotContentManually(knotBody, randomVars)
        if (knotNode) {
          // Wrap in a result node to show it's a conditional branch of the special node
          knotBranches.push(
            createNode({
              id: generateNodeId(),
              type: 'result',
              requirements: [`${branchingCommand}: ${knotName}`],
              children: [knotNode],
            })
          )
        }
      })

      totalNodesInCurrentEvent++
      // Return the branching point node with all knot branches as children
      return createNode({
        id: generateNodeId(),
        text: branchingCommand,
        type: 'special',
        effects,
        children: knotBranches,
      })
    }
  }

  if (!cleanedText && choices.length === 0) {
    // If it's a combat or end node, keep it
    if (type === 'combat') {
      // Combat-only event (like Ambush with >>>>COMBAT:random)
      totalNodesInCurrentEvent++
      return createNode({
        id: generateNodeId(),
        text: undefined,
        type: 'combat',
        effects: effects.length > 0 ? effects : undefined,
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
  if (OPTIMIZATION_PASS_CONFIG.CHOICE_AND_PATH_LOOP_DETECTION_ENABLED) {
    newStateToNodeId.set(currentStateHash, nodeId)
  }

  // Store text-to-node mapping for text-based loop detection (skip RANDOM_KEYWORD text so we don't collapse distinct branches)
  if (
    OPTIMIZATION_PASS_CONFIG.TEXT_LOOP_DETECTION_ENABLED &&
    cleanedText &&
    !cleanedText.includes(RANDOM_KEYWORD)
  ) {
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
  // For events with dialogue menu patterns (like Rathael), detect when we're at
  // a dialogue menu hub node (menuHubPattern). All children of the hub forsake their
  // own children and instead have a ref back to the hub, except for children matching menuExitPatterns.
  // This prevents hitting the node limit during tree building.
  // Note: We only check text here (not choiceLabel) because a parent and its child
  // will never both match menuHubPattern, so we only need to detect hubs via text.
  const dialogueMenuConfig = OPTIMIZATION_PASS_CONFIG.DIALOGUE_MENU_EVENTS[eventName]
  let isDialogueMenuHub = false
  if (dialogueMenuConfig) {
    // Check if this node's text matches menuHubPattern
    if (cleanedText && cleanedText.includes(dialogueMenuConfig.menuHubPattern)) {
      isDialogueMenuHub = true
      if (!dialogueMenuHubIdsByEventName.has(eventName)) {
        dialogueMenuHubIdsByEventName.set(eventName, nodeId)
      }

      // For events with hubChoiceMatchThreshold, capture snapshot of hub choices
      // Only capture from the FIRST hub node we encounter (don't overwrite existing snapshot)
      if (
        dialogueMenuConfig.hubChoiceMatchThreshold &&
        choices.length > 0 &&
        !hubChoiceSnapshots.has(eventName)
      ) {
        const hubChoiceLabels = new Set()
        for (const choice of choices) {
          const { cleanedText: choiceText } = extractChoiceMetadata(choice.text)
          // Exclude exit patterns from snapshot
          const isExitChoice = dialogueMenuConfig.menuExitPatterns.some((pattern) =>
            choiceText?.includes(pattern)
          )
          if (choiceText && !isExitChoice) {
            hubChoiceLabels.add(choiceText)
          }
        }

        if (hubChoiceLabels.size > 0) {
          hubChoiceSnapshots.set(eventName, {
            hubNodeId: nodeId,
            choiceLabels: hubChoiceLabels,
            threshold: dialogueMenuConfig.hubChoiceMatchThreshold,
          })
          if (eventName === DEBUG_EVENT_NAME) {
            console.log(
              `  🔍 Captured hub snapshot at nodeId=${nodeId}: ${hubChoiceLabels.size} choices: [${Array.from(hubChoiceLabels).join(', ')}]`
            )
          }
        }
      }
    }
  }

  // EARLY DEDUPLICATION: PATH CONVERGENCE DETECTION
  // Detects when we reach the same node (same text + choices) via different paths
  // This is like mini-dedup during tree building - prevents re-exploring identical branches
  // ONLY enabled for events in PATH_CONVERGENCE config (events that need it to parse successfully)
  //
  // IMPORTANT: Skip path convergence for:
  // 1. Nodes matching the hub pattern itself (let hub menu logic handle it)
  // 2. Nodes matching skipPatterns (let post-processing dedup handle them)
  let convergenceSignature = null
  const pathConvergenceConfig = OPTIMIZATION_PASS_CONFIG.PATH_CONVERGENCE[eventName]
  const enableEarlyDedupForThisEvent = pathConvergenceConfig !== undefined
  const skipForDialogueMenuHub = isDialogueMenuHub // Skip if THIS node is the hub
  const skipPatterns = pathConvergenceConfig?.skipPatterns || []
  const shouldSkipForPattern = skipPatterns.some((pattern) => cleanedText?.includes(pattern))

  if (
    enableEarlyDedupForThisEvent &&
    !skipForDialogueMenuHub &&
    !shouldSkipForPattern &&
    cleanedText &&
    choices.length >= OPTIMIZATION_PASS_CONFIG.PATH_CONVERGENCE_DEDUP_MIN_CHOICES
  ) {
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

  // Helper function to check if a choice should be built normally (matches menuExitPatterns)
  // or should become a ref node (doesn't match menuExitPatterns)
  function shouldBuildChildNormally(choiceText) {
    if (!isDialogueMenuHub || !dialogueMenuConfig) return true
    // Check if choiceLabel matches any of menuExitPatterns
    return dialogueMenuConfig.menuExitPatterns.some((pattern) => choiceText?.includes(pattern))
  }

  // Helper function to check if a node's children match the hub choice snapshot
  // Returns the hub node ID if match threshold is met, null otherwise
  function checkHubChoiceMatch(nodeChildren) {
    const snapshot = hubChoiceSnapshots.get(eventName)
    if (!snapshot || !nodeChildren || nodeChildren.length === 0) {
      return null
    }

    // Extract choiceLabels from node's children
    const nodeChoiceLabels = new Set()
    for (const child of nodeChildren) {
      if (child.choiceLabel) {
        nodeChoiceLabels.add(child.choiceLabel)
      }
    }

    if (nodeChoiceLabels.size === 0) return null

    // Count how many hub choices are present in node's children
    let matchCount = 0
    for (const hubChoice of snapshot.choiceLabels) {
      if (nodeChoiceLabels.has(hubChoice)) {
        matchCount++
      }
    }

    // Calculate match percentage (0-100)
    // This is: (number of hub choices found in node) / (total hub choices) * 100
    const matchPercentage = (matchCount / snapshot.choiceLabels.size) * 100

    // Warn if threshold is > 100 (will never match)
    if (snapshot.threshold > 100) {
      console.warn(
        `  ⚠️  Event "${eventName}": hubChoiceMatchThreshold (${snapshot.threshold}%) is > 100%, will never match`
      )
    }

    // Only log when match threshold is met (to reduce noise)
    if (matchPercentage >= snapshot.threshold) {
      if (eventName === DEBUG_EVENT_NAME) {
        console.log(
          `  ✅ Hub match found: ${matchCount}/${snapshot.choiceLabels.size} = ${matchPercentage.toFixed(1)}% (threshold: ${snapshot.threshold}%)`
        )
        console.log(`      Hub choices: ${Array.from(snapshot.choiceLabels).join(', ')}`)
        console.log(`      Node choices: ${Array.from(nodeChoiceLabels).join(', ')}`)
      }
      return snapshot.hubNodeId
    }

    // If signature check failed but passWhenOnlyExitPatternsAvailable is enabled,
    // check if ALL node choices match exit patterns
    if (dialogueMenuConfig?.passWhenOnlyExitPatternsAvailable) {
      const allChoicesAreExitPatterns = Array.from(nodeChoiceLabels).every((choiceLabel) =>
        dialogueMenuConfig.menuExitPatterns.some((pattern) => choiceLabel?.includes(pattern))
      )

      if (
        allChoicesAreExitPatterns &&
        nodeChoiceLabels.size === dialogueMenuConfig.menuExitPatterns.length
      ) {
        if (eventName === DEBUG_EVENT_NAME) {
          console.log(
            `  ✅ Hub match found via exit patterns fallback (all ${nodeChoiceLabels.size} choices match exit patterns)`
          )
          console.log(`      Exit patterns: ${dialogueMenuConfig.menuExitPatterns.join(', ')}`)
          console.log(`      Node choices: ${Array.from(nodeChoiceLabels).join(', ')}`)
        }
        return snapshot.hubNodeId
      }
    }

    return null
  }

  // Helper function to get child's text by continuing the story
  function getChildTextFromStory(story) {
    let childText = ''
    let childEffects = []
    let childNumContinues = 0
    try {
      let continueCount = 0
      while (story.canContinue) {
        const line = story.Continue()
        continueCount++
        if (line && line.trim()) {
          childText += (childText ? '\n' : '') + line.trim()
        }
      }
      childNumContinues = Math.max(0, continueCount - 1)
      const { effects: extractedEffects, cleanedText: cleanedChildText } = extractEffects(
        childText,
        functionDefinitions,
        functionCalls
      )
      childEffects = extractedEffects
      childText = cleanedChildText
    } catch (error) {
      // Handle gracefully
    }
    return { childText, childEffects, childNumContinues }
  }

  function buildChildNodeWhileHandlingDialogueHubDetection(
    story,
    storyState,
    choiceText,
    requirements,
    pathHash,
    shouldCheckEarlyRef
  ) {
    // Skip immediate ref logic for events with hubChoiceMatchThreshold
    // (like Rotting Residence) - we need to build children normally to detect hub matches later
    const shouldUseImmediateRefLogic =
      shouldCheckEarlyRef &&
      isDialogueMenuHub &&
      dialogueMenuConfig &&
      !dialogueMenuConfig.hubChoiceMatchThreshold &&
      !shouldBuildChildNormally(choiceText)

    if (shouldUseImmediateRefLogic) {
      // Early detection: check child's text before building subtree
      story.state.LoadJson(storyState)
      const stateAfterChoice = story.state.toJson()

      const { childText, childEffects, childNumContinues } = getChildTextFromStory(story)
      const childMatchesExit = dialogueMenuConfig.menuExitPatterns.some((pattern) =>
        childText?.includes(pattern)
      )

      if (childMatchesExit) {
        // Child matches exit pattern - restore state and build normally
        story.state.LoadJson(stateAfterChoice)
        const childNode = buildTreeFromStory(
          story,
          eventName,
          newVisitedStates,
          newStateToNodeId,
          depth + 1,
          pathHash,
          newAncestorTexts,
          newTextToNodeId,
          randomVars,
          functionDefinitions,
          functionCalls,
          knots
        )

        if (childNode) {
          return {
            node: childNode,
            isRef: false,
          }
        }
      } else {
        // Child doesn't match exit pattern - create ref node immediately
        totalNodesInCurrentEvent++
        return {
          node: createNode({
            id: generateNodeId(),
            text: childText,
            type: determineNodeType(childText, false),
            choiceLabel: choiceText,
            requirements: requirements.length > 0 ? requirements : undefined,
            effects: childEffects.length > 0 ? childEffects : undefined,
            numContinues: childNumContinues,
            ref: nodeId, // Ref back to hub
          }),
          isRef: true,
        }
      }
    }

    // Build normally (either not a hub, or matches exit pattern)
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
      randomVars,
      functionDefinitions,
      functionCalls,
      knots
    )

    if (childNode) {
      return {
        node: childNode,
        isRef: false,
      }
    }

    return null
  }

  // Helper function to recursively process children and check for hub matches
  // Returns processed children array with refs where hub matches are found
  function processChildrenForHubMatch(children, hubNodeId) {
    if (!children || children.length === 0) return children

    const processedChildren = []
    for (const child of children) {
      // Check if this child's children match the hub snapshot
      // Skip if this child is the hub itself (prevent checking hub against itself)
      if (child.children && child.children.length > 0 && child.id !== hubNodeId) {
        const matchedHubNodeId = checkHubChoiceMatch(child.children)
        // NOTE: hubNodeId can be 0
        const isValidMatch =
          matchedHubNodeId != null &&
          matchedHubNodeId !== child.id &&
          matchedHubNodeId === hubNodeId

        if (isValidMatch) {
          processedChildren.push(
            createNode({
              id: child.id,
              text: child.text,
              type: child.type,
              choiceLabel: child.choiceLabel,
              requirements: child.requirements,
              effects: child.effects,
              numContinues: child.numContinues,
              ref: matchedHubNodeId, // Ref back to hub
            })
          )
          continue
        }
      }

      // Recursively process this child's children
      const processedGrandchildren = processChildrenForHubMatch(child.children, hubNodeId)
      processedChildren.push(
        createNode({
          id: child.id,
          text: child.text,
          type: child.type,
          choiceLabel: child.choiceLabel,
          requirements: child.requirements,
          effects: child.effects,
          numContinues: child.numContinues,
          ref: child.ref,
          children: processedGrandchildren,
        })
      )
    }

    return processedChildren
  }

  // Helper function to create an ordered child node from a built child
  function createOrderedChild(childResult, choiceText, requirements) {
    if (!childResult) return null

    const { node: childNode, isRef } = childResult

    if (isRef) {
      // Already a ref node, return as-is
      return childNode
    }

    // Get hub node ID from snapshot for recursive processing
    const snapshot = hubChoiceSnapshots.get(eventName)
    const hubNodeId = snapshot ? snapshot.hubNodeId : null

    // Skip processing if this is the hub node itself (hub node should not be processed here)
    if (hubNodeId && childNode.id === hubNodeId) {
      // This is the hub node - don't process it, just return as-is
      return createNode({
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
    }

    // Recursively process children to check for hub matches at all levels
    const processedChildren = hubNodeId
      ? processChildrenForHubMatch(childNode.children, hubNodeId)
      : childNode.children

    // Create ordered child from built node
    return createNode({
      id: childNode.id,
      text: childNode.text,
      type: childNode.type,
      choiceLabel: choiceText,
      requirements: requirements.length > 0 ? requirements : childNode.requirements,
      effects: childNode.effects,
      numContinues: childNode.numContinues,
      ref: childNode.ref,
      children: processedChildren,
    })
  }

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
        const childResult = buildChildNodeWhileHandlingDialogueHubDetection(
          story,
          storyState,
          choiceText,
          requirements,
          pathHash,
          true
        )
        const orderedChild = createOrderedChild(childResult, choiceText, requirements)
        if (orderedChild) {
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
        const stateAfterChoice = story.state.toJson()

        const childResult = buildChildNodeWhileHandlingDialogueHubDetection(
          story,
          stateAfterChoice,
          choiceText,
          requirements,
          `${currentStateHash}_c${i}`,
          true
        )
        const orderedChild = createOrderedChild(childResult, choiceText, requirements)
        if (orderedChild) {
          children.push(orderedChild)
        }
      } catch (error) {
        console.warn(`    ⚠️  Error exploring choice in "${eventName}": ${error.message}`)
      }

      story.state.LoadJson(savedState)
    }
  }

  // POSTCOMBAT/AFTERCOMBAT SEPARATION
  // Combat nodes may have postcombat/aftercombat dialogue that should be in a separate child node
  // The raw text from Ink contains: [precombat text]\n>>>COMBAT:Enemy\n[postcombat text]
  // We need to:
  // 1. Keep precombat text in the combat node
  // 2. Move postcombat text to a new dialogue child node
  // 3. Move all original children to that dialogue node
  let finalText = cleanedText
  let finalChildren = children
  let finalEffects = effects

  if (type === 'combat' && text) {
    // Find the COMBAT command in the original text to split pre/post combat text
    // Match both >>>COMBAT and >>>>COMBAT (or just COMBAT if it appears without prefix)
    const combatMatch = text.match(/(>>>+)?COMBAT:[^\n]*/i)

    if (combatMatch) {
      const combatIndex = combatMatch.index
      const combatCommandLength = combatMatch[0].length

      // Extract pre-combat and post-combat text
      const preCombatText = text.substring(0, combatIndex).trim()
      const postCombatText = text.substring(combatIndex + combatCommandLength).trim()

      // Extract effects from postcombat text
      const { effects: postCombatEffects, cleanedText: cleanedPostCombatText } = extractEffects(
        postCombatText,
        functionDefinitions,
        functionCalls
      )

      // Clean the pre-combat text
      const { cleanedText: cleanedPreCombatText } = extractEffects(
        preCombatText,
        functionDefinitions,
        functionCalls
      )

      // If there's postcombat text, create a dialogue child node
      if (cleanedPostCombatText && cleanedPostCombatText.trim()) {
        // Create the postcombat dialogue node
        const postcombatNode = createNode({
          id: generateNodeId(),
          text: cleanedPostCombatText,
          type: children.length > 0 ? 'dialogue' : 'end',
          effects: postCombatEffects.length > 0 ? postCombatEffects : undefined,
          children: children.length > 0 ? children : undefined,
        })

        totalNodesInCurrentEvent++

        // Update final values: combat node gets pre-combat text, single child is postcombat node
        finalText = cleanedPreCombatText || undefined
        finalChildren = [postcombatNode]
        // Keep only combat-related effects in the combat node
        // (postcombat effects are now in the postcombat node)
        finalEffects = effects.filter((e) => e.includes('COMBAT:'))
      } else {
        // No postcombat text, just use pre-combat text
        finalText = cleanedPreCombatText || undefined
      }
    }
  }

  // Check for hub choice matches (for events with hubChoiceMatchThreshold)
  // This checks if this node's children match the hub snapshot
  // Only check nodes built AFTER the hub (nodeId > hubNodeId) to avoid checking pre-hub nodes
  // IMPORTANT: Check this BEFORE storing PATH_CONVERGENCE signature to avoid storing nodes that become refs
  const snapshot = hubChoiceSnapshots.get(eventName)
  if (
    snapshot &&
    finalChildren.length > 0 &&
    nodeId !== snapshot.hubNodeId &&
    nodeId > snapshot.hubNodeId
  ) {
    const matchedHubNodeId = checkHubChoiceMatch(finalChildren)
    // NOTE: hubNodeId can be 0, so don't use truthy checks here.
    if (matchedHubNodeId != null && matchedHubNodeId === snapshot.hubNodeId) {
      const safeText = finalText && finalText.trim() !== '' ? finalText : '[Choice point]'
      // This node's children match the hub snapshot - convert this node to a ref

      // NOTE: Here we are not taking into account that these nodes can be choices. Maybe they should never be...
      // Either way there are some weird occurences of [Choice point] in several events now that we need to fix at some point!
      return createNode({
        id: nodeId,
        text: safeText,
        type: type === 'choice' ? 'dialogue' : type,
        effects: finalEffects,
        numContinues,
        ref: matchedHubNodeId, // Ref back to hub
      })
    }
  }

  // Store early dedup signature AFTER checking for hub matches and AFTER building children
  // This ensures:
  // 1. Other paths won't create refs to incomplete nodes
  // 2. We don't store signatures for nodes that became hub refs
  // Only store if we actually have children (to avoid matching incomplete nodes)
  if (convergenceSignature && finalChildren.length > 0) {
    pathConvergenceStates.set(convergenceSignature, nodeId)
  }

  const safeText = type === 'combat' && !finalText ? undefined : finalText || '[Choice point]'

  // Build the node
  return createNode({
    id: nodeId,
    text: safeText,
    type,
    effects: finalEffects,
    numContinues,
    children: finalChildren,
  })
}

/**
 * Resolve ADDKEYWORD effect value, handling variable references and placeholders
 * Examples:
 *   "a keyword" -> "ADDKEYWORD: random"
 *   "chaos" -> multiple effects
 *   Variable from function (e.g., "Recall") -> "ADDKEYWORD: random [Recall, Figmented, ...]"
 *   Static keyword (e.g., "Defiled") -> "ADDKEYWORD: Defiled"
 */
function resolveSpecialKeywordEffects(value, functionDefinitions, functionCalls) {
  // Handle "a keyword" placeholder - game engine picks from all keywords
  if (value === 'a keyword') {
    return ['ADDKEYWORD: random']
  }

  // Handle "chaos" keyword - special case with multiple effects
  if (value === 'chaos') {
    return ['ADDKEYWORD: random', 'ADDKEYWORD: random', 'ADDTYPE: Corruption', 'SWAPCOST: blood']
  }

  // Check if this value comes from a function call
  // The inkjs runtime has already substituted variables, so we see "Recall" instead of "cardOne"
  // We check if any function could return this value
  for (const functionName of functionCalls.values()) {
    const returnValues = functionDefinitions.get(functionName)

    // If this function can return the value we're seeing, show all possible values
    if (returnValues && returnValues.length > 0 && returnValues.includes(value)) {
      return [`ADDKEYWORD: random [${returnValues.join(', ')}]`]
    }
  }

  // Default: just a static keyword
  return [`ADDKEYWORD: ${value}`]
}

/**
 * Extract effects (game commands) from text (beginning or middle)
 * Returns { effects: [...], cleanedText: "..." }
 */
function extractEffects(text, functionDefinitions = new Map(), functionCalls = new Map()) {
  if (!text) return { effects: [], cleanedText: '' }

  const effects = []
  let cleaned = text

  // Extract entire command sequences: >>>>COMMAND1:value1;COMMAND2:value2;COMMAND3
  // Pattern matches from >>> until we hit a newline, quote, or end
  // Includes uppercase, lowercase, numbers, and common punctuation in values
  // Note: Use [ \t] instead of \s to avoid matching newlines (which would break multi-line command extraction)
  const commandSequencePattern = />>>>?[A-Za-z0-9_:;'\[\]\(\)  \t\-\/]+(?=\n|"|$)/gi

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

      let newEffects
      if (value) {
        switch (command) {
          case 'COMBAT':
          case 'DIRECTCOMBAT':
            newEffects = [`COMBAT: ${value}`]
            break
          case 'ADDKEYWORD':
            newEffects = resolveSpecialKeywordEffects(value, functionDefinitions, functionCalls)
            break
          default:
            newEffects = [`${command}: ${value}`]
        }
      } else {
        newEffects = [command]
      }

      effects.push(...newEffects)
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

  // Remove color tags (including malformed closing tags like </color=red>)
  cleaned = cleaned.replace(/<color=[^>]+>/gi, '').replace(/<\/color[^>]*>/gi, '')

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
 *
 * Node types:
 * - 'dialogue': Standard dialogue node with text and/or choices
 * - 'choice': Choice wrapper node (created by separateChoicesFromEffects)
 * - 'combat': Combat encounter node
 * - 'end': Terminal node (no children)
 * - 'special': Type for special game mechanics (e.g., CARDPUZZLE)
 *              that require external handling.
 *  - 'result': Direct children of special nodes containing the result.
 */
function determineNodeType(text, isLeaf) {
  if (!text) return 'choice'

  if (text.includes('COMBAT:')) {
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
 * Each entry includes nodeId, refTarget, and identity (text or choiceLabel) for comparison.
 */
function findInvalidRefsInTree(rootNode, nodeMap) {
  const invalidRefs = []
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
 * Post-pass: for nodes whose effects contain "GOLD: random [min - max]" or "DAMAGE: random [min - max]",
 * replace numeric gold/damage in node.text (e.g. "47 gold", "5 damage") with «random» gold/damage.
 */
function cleanUpRandomValues(eventTrees) {
  const goldRandomEffectRe = /^GOLD:\s*random\s*\[\s*(\d+)\s*-\s*(\d+)\s*\]$/i
  const damageRandomEffectRe = /^DAMAGE:\s*random\s*\[\s*(\d+)\s*-\s*(\d+)\s*\]$/i
  const goldInTextRe = /\b(\d+)\s*(gold)\b/gi
  const damageInTextRe = /\b(\d+)\s*(damage)\b/gi
  let updated = 0

  function visit(node) {
    if (!node) return
    if (node.effects && Array.isArray(node.effects) && node.text) {
      let newText = node.text
      for (const effect of node.effects) {
        const goldM = String(effect).match(goldRandomEffectRe)
        if (goldM) {
          const min = parseInt(goldM[1], 10)
          const max = parseInt(goldM[2], 10)
          newText = newText.replace(goldInTextRe, (_, numStr, word) => {
            const n = parseInt(numStr, 10)
            return n >= min && n <= max ? `${RANDOM_KEYWORD} ${word}` : `${numStr} ${word}`
          })
          break
        }
      }
      for (const effect of node.effects) {
        const damageM = String(effect).match(damageRandomEffectRe)
        if (damageM) {
          const min = parseInt(damageM[1], 10)
          const max = parseInt(damageM[2], 10)
          newText = newText.replace(damageInTextRe, (_, numStr, word) => {
            const n = parseInt(numStr, 10)
            return n >= min && n <= max ? `${RANDOM_KEYWORD} ${word}` : `${numStr} ${word}`
          })
          break
        }
      }
      if (newText !== node.text) {
        node.text = newText
        updated++
      }
    }
    if (node.children) node.children.forEach(visit)
  }

  eventTrees.forEach((tree) => tree.rootNode && visit(tree.rootNode))
  if (updated > 0) {
    console.log(`\n🎲 Cleaned up random gold/damage in text: ${updated} node(s)`)
  }
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
    if (eventName === DEBUG_EVENT_NAME) {
      console.log('\n 📜 All invalid refs:')
      eventsWithInvalidRefs.forEach(({ name, examples }) => {
        examples.forEach(({ nodeId, refTarget }) => {
          console.log(`    - "${name}" Node ${nodeId} -> ${refTarget} (target not found)`)
        })
      })
    }

    if (eventName === DEBUG_EVENT_NAME) {
      const debugTree = eventTrees.find((t) => t.name === DEBUG_EVENT_NAME)
      if (debugTree?.rootNode) {
        const nodeMap = buildNodeMapForTree(debugTree.rootNode)
        const invalidRefs = findInvalidRefsInTree(debugTree.rootNode, nodeMap)
        if (invalidRefs.length > 0) {
          console.log(`\n  Debug event "${DEBUG_EVENT_NAME}" invalid refs (showing up to 25):`)
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

function debugCheckEventPipelineState(eventTrees, stageLabel) {
  if (typeof DEBUG_EVENT_NAME !== 'string' || !DEBUG_EVENT_NAME) return
  const debugTree = eventTrees.find((t) => t.name === DEBUG_EVENT_NAME)
  if (!debugTree?.rootNode) return

  const nodeMap = buildNodeMapForTree(debugTree.rootNode)
  const invalidRefs = findInvalidRefsInTree(debugTree.rootNode, nodeMap)

  const hubId = dialogueMenuHubIdsByEventName.get(DEBUG_EVENT_NAME)
  const hubStatus = hubId != null ? (nodeMap.has(hubId) ? 'present' : 'MISSING') : 'n/a'

  console.log(
    `  🧪 [${DEBUG_EVENT_NAME}] ${stageLabel}: nodes=${nodeMap.size}, hubId=${hubId ?? 'n/a'} (${hubStatus}), invalidRefs=${invalidRefs.length}`
  )

  if (invalidRefs.length > 0) {
    const uniqueMissingTargets = Array.from(new Set(invalidRefs.map((r) => r.refTarget))).slice(
      0,
      10
    )
    console.log(`      Missing targets (up to 10): ${uniqueMissingTargets.join(', ')}`)
  }
}

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
 * dialogue child.
 *
 * Example:
 *   BEFORE normalization:
 *     Combat Node (id=100)
 *       └─ Postcombat Dialogue Node (id=101, text="hub dialogue", children=[...])
 *     Some Other Node (ref=100)  // ❌ Points to combat node
 *
 *   AFTER normalization:
 *     Combat Node (id=100)
 *       └─ Postcombat Dialogue Node (id=101, text="hub dialogue", children=[...])
 *     Some Other Node (ref=101)  // ✅ Points to postcombat dialogue node
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

      // If this node has a ref pointing to a split combat node, redirect it to the postcombat child
      if (node.ref !== undefined && combatNodeToPostcombatChild.has(node.ref)) {
        const oldRef = node.ref
        const newRef = combatNodeToPostcombatChild.get(oldRef)
        node.ref = newRef
        rewritesForEvent++

        if (eventName === DEBUG_EVENT_NAME) {
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

    const shallowRefToHub = hubTextNodes
      .filter((n) => n.ref !== undefined && n.ref === hubWithChildren.id)
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

    // Rewrite: anything that referenced old hub should now reference new hub
    nodesById.forEach((node) => {
      if (node.ref !== undefined && node.ref === oldHubId) {
        node.ref = newHubId
      }
    })

    if (eventName === DEBUG_EVENT_NAME) {
      console.log(
        `  🧭 Promoted hub for "${eventName}": ${oldHubId}@depth${hubDepth} -> ${newHubId}@depth${refDepth}`
      )
    }
  })
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
 * Main processing function
 */
async function processEvents() {
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
      if (displayName === DEBUG_EVENT_NAME) {
        console.log(`  ⊘  [${i + 1}/${events.length}] Skipping "${displayName}" (no text content)`)
      }
      emptyCount++
      continue
    }

    if (displayName === DEBUG_EVENT_NAME) {
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
      if (displayName === DEBUG_EVENT_NAME) {
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
  debugCheckEventPipelineState(eventTrees, 'after parse (pre-sort)')

  // Sort events alphabetically by name
  console.log(`\n🔤 Sorting events alphabetically...`)
  eventTrees.sort((a, b) => a.name.localeCompare(b.name))

  // Filter out default nodes for specific events
  if (OPTIMIZATION_PASS_CONFIG.FILTER_DEFAULT_NODES_ENABLED) {
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
    debugCheckEventPipelineState(eventTrees, 'after filterDefaultNodes')
  }

  // Separate choices from their effects for clearer visualization
  if (OPTIMIZATION_PASS_CONFIG.SEPARATE_CHOICES_FROM_EFFECTS_ENABLED) {
    console.log('\n🔀 Separating choices from effects...')
    let totalSeparated = 0
    eventTrees.forEach((tree) => {
      const separatedCount = separateChoicesFromEffects(tree.rootNode)
      totalSeparated += separatedCount
    })
    console.log(`  Separated ${totalSeparated} choice-effect pairs`)
    debugCheckEventPipelineState(eventTrees, 'after separateChoicesFromEffects')
  }

  // When choice's only child has ADDKEYWORD: random [list], set choiceLabel to "Add «random»"
  console.log('\n🏷️  Normalizing ADDKEYWORD random choice labels...')
  let addKeywordRandomLabelsUpdated = 0
  eventTrees.forEach((tree) => {
    if (tree.rootNode) {
      const stats = normalizeAddKeywordRandomChoiceLabels(tree.rootNode)
      addKeywordRandomLabelsUpdated += stats.updated
    }
  })
  console.log(`  Updated ${addKeywordRandomLabelsUpdated} choice label(s) to "Add «random»"`)

  // Fetch card/talent id->name mapping (used by Cardgame pass and by replaceCardIdsInNode later)
  console.log('\n🃏 Fetching card/talent data for ID replacement...')
  const idToName = await buildIdToNameMapping()

  // Calculate stats before deduplication
  const nodesBeforeDedupe = eventTrees.reduce((sum, tree) => sum + countNodes(tree.rootNode), 0)

  // Deduplicate subtrees
  const dedupeIterations = Math.max(0, OPTIMIZATION_PASS_CONFIG.DEDUPLICATE_SUBTREES_NUM_ITERATIONS)
  if (dedupeIterations > 0) {
    console.log(
      `\n🔄 Deduplicating subtrees... (${dedupeIterations} pass${dedupeIterations === 1 ? '' : 'es'})`
    )
    const { totalDuplicates, totalNodesRemoved, eventsWithDedupe, iterationsRun } =
      deduplicateAllTrees(eventTrees, dedupeIterations)
    console.log(`  Replaced ${totalDuplicates} duplicate subtrees`)
    console.log(`  Reduced node count by ${totalNodesRemoved}`)
    if (iterationsRun !== dedupeIterations) {
      console.log(
        `  Stopped early after ${iterationsRun} pass${iterationsRun === 1 ? '' : 'es'} (no more nodes pruned)`
      )
    }

    if (eventsWithDedupe.length > 0) {
      console.log(`\n  Events with deduplication:`)
      eventsWithDedupe.forEach(({ name, duplicates, nodesRemoved }) => {
        console.log(`    - "${name}": ${duplicates} duplicates, ${nodesRemoved} nodes removed`)
      })
    }
    debugCheckEventPipelineState(eventTrees, 'after deduplicateAllTrees')
  }

  // Normalize refs away from choice wrapper nodes (after dedupe, before refChildren conversion)
  if (OPTIMIZATION_PASS_CONFIG.NORMALIZE_REFS_POINTING_TO_CHOICE_NODES_ENABLED) {
    console.log('\n🎯 Normalizing refs to skip choice wrappers...')
    const { totalRewrites, eventsWithRewrites } = normalizeRefsPointingToChoiceNodes(eventTrees)
    console.log(`  Rewrote ${totalRewrites} refs`)
    if (eventsWithRewrites.length > 0) {
      console.log(`\n  Events with ref rewrites:`)
      eventsWithRewrites.forEach(({ name, rewrites }) => {
        console.log(`    - "${name}": ${rewrites} refs rewritten`)
      })
    }
    debugCheckEventPipelineState(eventTrees, 'after normalizeRefsPointingToChoiceNodes')
  }

  // Normalize refs away from split combat nodes (after postcombat separation)
  // This fixes refs that point to combat nodes which have been split into combat + postcombat dialogue
  console.log('\n⚔️  Normalizing refs pointing to split combat nodes...')
  const { totalRewrites: combatRefRewrites, eventsWithRewrites: eventsWithCombatRefRewrites } =
    normalizeRefsPointingToCombatNodes(eventTrees)
  console.log(`  Rewrote ${combatRefRewrites} refs`)
  if (eventsWithCombatRefRewrites.length > 0) {
    console.log(`\n  Events with ref rewrites:`)
    eventsWithCombatRefRewrites.forEach(({ name, rewrites }) => {
      console.log(`    - "${name}": ${rewrites} refs rewritten`)
    })
  }
  debugCheckEventPipelineState(eventTrees, 'after normalizeRefsPointingToCombatNodes')

  if (OPTIMIZATION_PASS_CONFIG.PROMOTE_SHALLOW_DIALOGUE_MENU_HUB_ENABLED) {
    console.log('\n🧭 Promoting shallow dialogue-menu hubs...')
    promoteShallowDialogueMenuHub(eventTrees)
    debugCheckEventPipelineState(eventTrees, 'after promoteShallowDialogueMenuHub')
  }

  if (OPTIMIZATION_PASS_CONFIG.CONVERT_SIBLING_AND_COUSIN_REFS_TO_REF_CHILDREN_ENABLED) {
    console.log('\n🔗 Converting sibling and SIMPLE cousin refs to refChildren...')
    const { totalConversions, eventsWithConversions } =
      convertSiblingAndCousinRefsToRefChildren(eventTrees)
    console.log(`  Converted ${totalConversions} sibling refs`)

    if (eventsWithConversions.length > 0) {
      console.log(`\n  Events with conversions:`)
      eventsWithConversions.forEach(({ name, conversions }) => {
        console.log(`    - "${name}": ${conversions} sibling refs converted`)
      })
    }
    debugCheckEventPipelineState(eventTrees, 'after convertSiblingAndCousinRefsToRefChildren')
  }

  // Apply event alterations (manual fixes for conditional choices, etc.)
  // This runs AFTER all optimizations so that refChildren can be resolved correctly
  if (OPTIMIZATION_PASS_CONFIG.APPLY_EVENT_ALTERATIONS_ENABLED) {
    console.log('\n🔧 Applying event alterations...')
    let totalAlterations = 0
    try {
      if (EVENT_ALTERATIONS && Array.isArray(EVENT_ALTERATIONS)) {
        eventTrees.forEach((tree) => {
          const eventAlterations = EVENT_ALTERATIONS.find((a) => a.name === tree.name)
          if (eventAlterations) {
            const appliedCount = applyEventAlterations(tree.rootNode, eventAlterations.alterations)
            if (appliedCount > 0) {
              totalAlterations += appliedCount
              if (tree.name === DEBUG_EVENT_NAME) {
                console.log(`  - "${tree.name}": applied ${appliedCount} alteration(s)`)
              }
            }
          }
        })
        if (totalAlterations > 0) {
          console.log(`  Applied ${totalAlterations} alteration(s)`)
        } else {
          console.log(`  No alterations to apply`)
        }
      } else {
        console.log(`  No event alterations module found`)
      }
    } catch (error) {
      console.warn(`  ⚠️  Error applying event alterations: ${error.message}`)
    }
    debugCheckEventPipelineState(eventTrees, 'after applyEventAlterations')
  }

  if (OPTIMIZATION_PASS_CONFIG.CHECK_INVALID_REFS_ENABLED) {
    checkInvalidRefs(eventTrees)
  }

  if (OPTIMIZATION_PASS_CONFIG.CLEAN_UP_RANDOM_VALUES_ENABLED) {
    cleanUpRandomValues(eventTrees)
  }

  // Replace card/talent IDs with names in choiceLabel, text, and effects
  // Fixes events that use dynamic card refs (e.g. [cardid=VAR] at runtime, AREAEFFECT: id)
  console.log('\n🃏 Replacing card/talent IDs with names...')
  const replaceStats = { replaced: 0 }
  eventTrees.forEach((tree) => {
    if (tree.rootNode) replaceCardIdsInNode(tree.rootNode, idToName, replaceStats)
  })
  console.log(`  Replaced ${replaceStats.replaced} card/talent ID reference(s)`)

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
}

/**
 * Apply event alterations from event-alterations.json
 * Supports:
 * - Finding nodes by text or choiceLabel (find)
 * - Finding nodes by effect (findByEffect)
 * - Updating nodes (e.g., adding requirements)
 * - Adding new child nodes (addChild)
 * - Replacing entire nodes (replaceNode)
 */
function applyEventAlterations(rootNode, alterations) {
  if (!rootNode || !alterations || alterations.length === 0) return 0

  let appliedCount = 0

  for (const alteration of alterations) {
    const { find, addRequirements, addChild, replaceNode, replaceChildren, modifyNode } = alteration

    // Validate that we have a find method
    if (!find) {
      console.warn(`  ⚠️  Alteration missing "find" field: ${JSON.stringify(alteration)}`)
      continue
    }

    // Find matching nodes recursively
    let matchingNodes = []
    let searchDescription = ''

    // Validate find is an object
    if (typeof find !== 'object' || find === null) {
      console.warn(`  ⚠️  Alteration "find" must be an object: ${JSON.stringify(alteration)}`)
      continue
    }

    // Find nodes based on criteria
    if (find.textStartsWith !== undefined) {
      matchingNodes = findNodesByTextStartsWith(rootNode, find.textStartsWith)
      searchDescription = `textStartsWith: "${find.textStartsWith}"`
    } else if (find.textOrLabel !== undefined) {
      const hasEffect = find.effect !== undefined
      if (hasEffect) {
        // Search by textOrLabel AND effect
        matchingNodes = findNodesByTextOrLabelAndEffect(rootNode, find.textOrLabel, find.effect)
        searchDescription = `textOrLabel: "${find.textOrLabel}" + effect: "${find.effect}"`
      } else {
        // Search by textOrLabel only
        matchingNodes = findNodesByTextOrChoiceLabel(rootNode, find.textOrLabel)
        searchDescription = `textOrLabel: "${find.textOrLabel}"`
      }
    } else if (find.effect !== undefined) {
      // Search by effect only
      matchingNodes = findNodesByEffect(rootNode, find.effect)
      searchDescription = `effect: "${find.effect}"`
    } else {
      console.warn(`  ⚠️  Alteration has invalid find record: ${JSON.stringify(find)}`)
      continue
    }

    if (matchingNodes.length === 0) {
      console.warn(`  ⚠️  No nodes found matching: ${searchDescription}`)
      continue
    }

    // Replace entire node
    if (replaceNode) {
      for (const match of matchingNodes) {
        const refTargetMap = {}
        const refSourceNodes = []
        const refCreateNodes = []
        const newNode = createNodeFromAlterationSpec(
          replaceNode,
          refTargetMap,
          refSourceNodes,
          refCreateNodes
        )
        if (newNode) {
          // Copy the old node's ID to preserve references
          newNode.id = match.id

          // Resolve refSource nodes to actual refs (within the alteration)
          for (const { node, refSource } of refSourceNodes) {
            const targetNodeId = refTargetMap[refSource]
            if (targetNodeId !== undefined) {
              node.ref = targetNodeId
            } else {
              console.warn(
                `  ⚠️  refSource ${refSource} not found in refTargetMap for alteration in node ${node.id}`
              )
            }
          }

          // Resolve refCreate nodes to actual refs (search the entire tree)
          for (const { node, refCreate } of refCreateNodes) {
            const candidates = findNodesByTextOrChoiceLabel(rootNode, refCreate)
            // Find the first candidate that doesn't have a ref (it's the original node)
            const targetNode = candidates.find((candidate) => candidate.ref === undefined)
            if (targetNode) {
              node.ref = targetNode.id
            } else {
              console.warn(
                `  ⚠️  refCreate "${refCreate}" did not find a matching node without a ref for node ${node.id}`
              )
            }
          }

          // Replace all properties of the matched node with the new node
          Object.keys(match).forEach((key) => delete match[key])
          Object.assign(match, newNode)
          appliedCount++
        }
      }
      continue // Skip other operations if we're replacing the node
    }

    // Replace children of matched nodes
    if (replaceChildren && Array.isArray(replaceChildren)) {
      for (const match of matchingNodes) {
        const refTargetMap = {}
        const refSourceNodes = []
        const refCreateNodes = []
        const newChildren = replaceChildren
          .map((spec) =>
            createNodeFromAlterationSpec(spec, refTargetMap, refSourceNodes, refCreateNodes)
          )
          .filter((c) => c !== null)

        const firstWithChildren = newChildren.find((c) => c.children?.length)
        if (firstWithChildren) {
          const resultIds = firstWithChildren.children.map((c) => c.id)
          replaceChildren.forEach((spec, i) => {
            if (spec.refChildrenFromFirstSibling && newChildren[i]) {
              newChildren[i].refChildren = resultIds
            }
          })
        }

        for (const { node: n, refSource } of refSourceNodes) {
          const targetId = refTargetMap[refSource]
          if (targetId !== undefined) n.ref = targetId
        }
        for (const { node: n, refCreate } of refCreateNodes) {
          const candidates = findNodesByTextOrChoiceLabel(rootNode, refCreate)
          const target = candidates.find((c) => c.ref === undefined)
          if (target) n.ref = target.id
        }

        match.children = newChildren
        appliedCount++
      }
      continue
    }

    if (addRequirements) {
      // Filter out empty strings
      const newRequirements = addRequirements.filter((req) => req && typeof req === 'string')

      if (newRequirements.length > 0) {
        for (const node of matchingNodes) {
          // Merge with existing requirements, avoiding duplicates
          if (node.requirements) {
            const existingSet = new Set(node.requirements)
            newRequirements.forEach((req) => existingSet.add(req))
            node.requirements = Array.from(existingSet)
          } else {
            node.requirements = newRequirements
          }
          appliedCount++
        }
      }
    }

    // Modify node properties
    if (modifyNode) {
      for (const node of matchingNodes) {
        // Remove fields if specified with null
        if (modifyNode.removeRef && node.ref !== undefined) {
          delete node.ref
        }
        if (modifyNode.removeText && node.text !== undefined) {
          delete node.text
        }
        if (modifyNode.removeNumContinues && node.numContinues !== undefined) {
          delete node.numContinues
        }
        if (modifyNode.removeChildren && node.children !== undefined) {
          delete node.children
        }

        // Set new values
        if (modifyNode.type !== undefined) {
          node.type = modifyNode.type
        }

        // Handle refCreate: search the tree for a matching node and create a ref
        if (modifyNode.refCreate !== undefined) {
          const candidates = findNodesByTextOrChoiceLabel(rootNode, modifyNode.refCreate)
          const targetNode = candidates.find((candidate) => candidate.ref === undefined)
          if (targetNode) {
            node.ref = targetNode.id
          } else {
            console.warn(
              `  ⚠️  refCreate "${modifyNode.refCreate}" did not find a matching node without a ref for node ${node.id}`
            )
          }
        }

        // Handle refCreateStartsWith: ref to first node whose text/choiceLabel starts with the string
        if (modifyNode.refCreateStartsWith !== undefined) {
          const candidates = findNodesByTextStartsWith(rootNode, modifyNode.refCreateStartsWith)
          const targetNode = candidates.find((candidate) => candidate.ref === undefined)
          if (targetNode) {
            node.ref = targetNode.id
          } else {
            console.warn(
              `  ⚠️  refCreateStartsWith "${modifyNode.refCreateStartsWith}" did not find a matching node for node ${node.id}`
            )
          }
        }

        appliedCount++
      }
    }

    // Add children
    if (addChild) {
      for (const node of matchingNodes) {
        const refTargetMap = {}
        const refSourceNodes = []
        const refCreateNodes = []
        const newChild = createNodeFromAlterationSpec(
          addChild,
          refTargetMap,
          refSourceNodes,
          refCreateNodes
        )
        if (newChild) {
          // Resolve refSource nodes to actual refs (within the alteration)
          for (const { node: childNode, refSource } of refSourceNodes) {
            const targetNodeId = refTargetMap[refSource]
            if (targetNodeId !== undefined) {
              childNode.ref = targetNodeId
            } else {
              console.warn(
                `  ⚠️  refSource ${refSource} not found in refTargetMap for alteration in node ${childNode.id}`
              )
            }
          }

          // Resolve refCreate nodes to actual refs (search the entire tree)
          for (const { node: childNode, refCreate } of refCreateNodes) {
            const candidates = findNodesByTextOrChoiceLabel(rootNode, refCreate)
            // Find the first candidate that doesn't have a ref (it's the original node)
            const targetNode = candidates.find((candidate) => candidate.ref === undefined)
            if (targetNode) {
              childNode.ref = targetNode.id
            } else {
              console.warn(
                `  ⚠️  refCreate "${refCreate}" did not find a matching node without a ref for node ${childNode.id}`
              )
            }
          }

          if (!node.children) {
            node.children = []
          }
          node.children.push(newChild)
          appliedCount++
        }
      }
    }
  }

  return appliedCount
}

/**
 * Recursively find nodes matching text or choiceLabel
 */
function findNodesByTextOrChoiceLabel(node, searchText) {
  const matches = []

  if (!node) return matches

  // Check if this node matches
  if (
    (node.text && node.text.includes(searchText)) ||
    (node.choiceLabel && node.choiceLabel.includes(searchText))
  ) {
    matches.push(node)
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByTextOrChoiceLabel(child, searchText))
    }
  }

  return matches
}

/**
 * Recursively find nodes where text or choiceLabel starts with the given string
 */
function findNodesByTextStartsWith(node, searchText) {
  const matches = []

  if (!node) return matches

  const textOrLabel = node.text || node.choiceLabel || ''
  if (textOrLabel.startsWith(searchText)) {
    matches.push(node)
  }

  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByTextStartsWith(child, searchText))
    }
  }

  return matches
}

/**
 * Recursively find nodes matching textOrLabel AND effect
 */
function findNodesByTextOrLabelAndEffect(node, searchText, searchEffect) {
  const matches = []

  if (!node) return matches

  // Check text or choiceLabel match
  const textOrLabelMatches =
    (node.text && node.text.includes(searchText)) ||
    (node.choiceLabel && node.choiceLabel.includes(searchText))

  // Check effect match
  const effectMatches =
    node.effects &&
    Array.isArray(node.effects) &&
    node.effects.some((effect) => effect.includes(searchEffect))

  if (textOrLabelMatches && effectMatches) {
    matches.push(node)
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByTextOrLabelAndEffect(child, searchText, searchEffect))
    }
  }

  return matches
}

/**
 * Recursively find nodes that have a specific effect
 */
function findNodesByEffect(node, effectToFind) {
  const matches = []

  if (!node) return matches

  // Check if this node has the effect
  if (node.effects && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (effect.includes(effectToFind)) {
        matches.push(node)
        break // Only add the node once even if it has multiple matching effects
      }
    }
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      matches.push(...findNodesByEffect(child, effectToFind))
    }
  }

  return matches
}

/**
 * Create a node from an alteration specification
 * Recursively creates children and assigns IDs
 *
 * Supports refTarget/refSource/refCreate for creating refs within alterations:
 * - refTarget: Marks a node as a ref target with a numeric ID
 * - refSource: Will be converted to ref: <node_id> pointing to the refTarget node
 * - refCreate: Will be converted to ref: <node_id> pointing to a node in the tree that matches
 *              the text/choiceLabel and has no ref of its own (the original node)
 *
 * @param {Object} spec - The node specification
 * @param {Object} refTargetMap - Map of refTarget numbers to actual node IDs
 * @param {Array} refSourceNodes - Array to collect nodes that need refSource resolution
 * @param {Array} refCreateNodes - Array to collect nodes that need refCreate resolution
 * @returns {Object} The created node
 */
function createNodeFromAlterationSpec(
  spec,
  refTargetMap = {},
  refSourceNodes = [],
  refCreateNodes = []
) {
  if (!spec || !spec.type) {
    console.warn(`  ⚠️  Invalid node spec: missing type`)
    return null
  }

  const node = {
    id: generateNodeId(),
    type: spec.type,
  }

  if (spec.text !== undefined) {
    node.text = spec.text
  }

  if (spec.choiceLabel !== undefined) {
    node.choiceLabel = spec.choiceLabel
  }

  if (spec.speaker !== undefined) {
    node.speaker = spec.speaker
  }

  // Requirements are now just strings directly
  if (spec.requirements) {
    const normalized = spec.requirements.filter((req) => req && typeof req === 'string')
    if (normalized.length > 0) {
      node.requirements = normalized
    }
  }

  if (spec.effects) {
    node.effects = Array.isArray(spec.effects) ? spec.effects.filter((e) => e) : [spec.effects]
  }

  if (spec.numContinues !== undefined) {
    node.numContinues = spec.numContinues
  }

  if (spec.ref !== undefined) {
    // NOTE: This probably breaks very easily, if our tree building decides to assign
    // a different node id than our ref in the alteration spec is pointing to.
    node.ref = spec.ref
  }

  if (spec.refChildren !== undefined) {
    node.refChildren = Array.isArray(spec.refChildren) ? spec.refChildren : [spec.refChildren]
  }

  // Handle refTarget: mark this node as a target for refs
  if (spec.refTarget !== undefined) {
    refTargetMap[spec.refTarget] = node.id
  }

  // Handle refSource: mark this node for later ref resolution
  if (spec.refSource !== undefined) {
    refSourceNodes.push({ node, refSource: spec.refSource })
  }

  // Handle refCreate: mark this node for later ref resolution by searching the tree
  if (spec.refCreate !== undefined) {
    refCreateNodes.push({ node, refCreate: spec.refCreate })
  }

  // Recursively create children
  if (spec.children && Array.isArray(spec.children)) {
    node.children = spec.children
      .map((childSpec) =>
        createNodeFromAlterationSpec(childSpec, refTargetMap, refSourceNodes, refCreateNodes)
      )
      .filter((child) => child !== null)
  }

  return node
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
        (hasEffects ||
          hasSubstantialText ||
          (child.children && child.children.length > 0) ||
          isEndNode)

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

const ADDKEYWORD_RANDOM_LIST_RE = /ADDKEYWORD:\s*random\s*\[/

/**
 * When a choice node's only child has effect "ADDKEYWORD: random [A, B, C, ...]",
 * set the choice's label to "Add «random»" (the label was one specific keyword from the list).
 * Runs after separateChoicesFromEffects so structure is choice -> outcome node with effects.
 */
function normalizeAddKeywordRandomChoiceLabels(node, stats = { updated: 0 }) {
  if (!node) return stats
  if (node.type === 'choice' && node.children?.length === 1) {
    const child = node.children[0]
    const effects = child.effects
    if (
      Array.isArray(effects) &&
      effects.some((e) => typeof e === 'string' && ADDKEYWORD_RANDOM_LIST_RE.test(e))
    ) {
      node.choiceLabel = 'Add «random»'
      stats.updated++
    }
  }
  if (node.children) {
    for (const child of node.children) {
      normalizeAddKeywordRandomChoiceLabels(child, stats)
    }
  }
  return stats
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
 * Get descendant count at a specific depth for a node
 * @param {Object} node - The node to check
 * @param {number} depth - How many levels down to count (1 = children, 2 = grandchildren, etc.)
 * @returns {number} Count of descendants at the specified depth
 */
function getDescendantCountAtDepth(node, depth) {
  if (depth <= 0 || !node.children || node.children.length === 0) return 0
  if (depth === 1) return node.children.length
  // For depth > 1, sum up descendants at that depth from all children
  return node.children.reduce((sum, child) => sum + getDescendantCountAtDepth(child, depth - 1), 0)
}

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
          const refChildrenIds = child.children ? child.children.map((c) => c.id) : []

          // Create new node with refChildren instead of ref
          const convertedNode = {
            ...potentialRefNode,
            refChildren: refChildrenIds,
          }

          // Remove the ref field
          delete convertedNode.ref

          // Verify that this node doesn't have children (as per requirement)
          if (potentialRefNode.children && potentialRefNode.children.length > 0) {
            console.warn(
              `  ⚠️  Node ${potentialRefNode.id} has both ref and children - this shouldn't happen!`
            )
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
function convertCousinRefsInTree(rootNode) {
  let conversionsCount = 0

  // Build parent map and node map
  const parentMap = new Map() // nodeId -> parent node
  const nodeMap = new Map() // nodeId -> node

  function buildMaps(node, parent = null) {
    if (!node) return
    nodeMap.set(node.id, node)
    if (parent) {
      parentMap.set(node.id, parent)
    }
    if (node.children) {
      node.children.forEach((child) => buildMaps(child, node))
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
            const refParentIsChild = refParentParent.children.some((c) => c.id === refNodeParent.id)
            const targetParentIsChild = refParentParent.children.some(
              (c) => c.id === targetNodeParent.id
            )
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

            if (
              refGrandparentParent &&
              targetGrandparentParent &&
              refGrandparentParent.id === targetGrandparentParent.id
            ) {
              // Found common ancestor - verify grandparents are direct children
              if (refGrandparentParent.children) {
                const refGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === refGrandparentCurrent.id
                )
                const targetGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === targetGrandparentCurrent.id
                )
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
        const targetNodeIsSingleChild =
          targetNodeParent.children && targetNodeParent.children.length === 1

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
            const refGrandparentIndex = node.children.findIndex((p) => p.id === refGrandparent.id)
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
        const refChildrenIds = cousinRef.targetNode.children
          ? cousinRef.targetNode.children.map((c) => c.id)
          : []
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
  const nodeMap = new Map() // nodeId -> node

  function buildMaps(node, parent = null) {
    if (!node) return
    nodeMap.set(node.id, node)
    if (parent) {
      parentMap.set(node.id, parent)
    }
    if (node.children) {
      node.children.forEach((child) => buildMaps(child, node))
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
            const refParentIsChild = refParentParent.children.some((c) => c.id === refNodeParent.id)
            const targetParentIsChild = refParentParent.children.some(
              (c) => c.id === targetNodeParent.id
            )
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

            if (
              refGrandparentParent &&
              targetGrandparentParent &&
              refGrandparentParent.id === targetGrandparentParent.id
            ) {
              // Found common ancestor - verify grandparents are direct children
              if (refGrandparentParent.children) {
                const refGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === refGrandparentCurrent.id
                )
                const targetGrandparentIsChild = refGrandparentParent.children.some(
                  (c) => c.id === targetGrandparentCurrent.id
                )
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

    const targetNodes = new Set(cousinRefs.map((cr) => cr.targetNode.id))
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

    const refNodes = new Set(cousinRefs.map((cr) => cr.refNode.id))
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
      const refChildrenIds = cousinRef.targetNode.children
        ? cousinRef.targetNode.children.map((c) => c.id)
        : []
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
  const skipCousinConversions = OPTIMIZATION_PASS_CONFIG.COUSIN_REF_BLACKLIST.includes(eventName)
  const skipComplexCousinConversions =
    OPTIMIZATION_PASS_CONFIG.COMPLEX_COUSIN_REF_BLACKLIST.includes(eventName)

  const siblingConversions = convertSiblingRefsInTree(rootNode)
  const cousinConversions = skipCousinConversions ? 0 : convertCousinRefsInTree(rootNode)
  const complexCousinConversions =
    skipCousinConversions || skipComplexCousinConversions
      ? 0
      : convertNonSingleChildCousinRefsInTree(rootNode)
  return siblingConversions + cousinConversions + complexCousinConversions
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

// Run the script
;(async () => {
  try {
    await processEvents()
  } catch (error) {
    console.error('❌ Fatal error:', error)
    console.error(error.stack)
    process.exit(1)
  }
})()
