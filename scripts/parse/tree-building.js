/* eslint-disable */
/**
 * Ink story -> hierarchical event tree building.
 *
 * Uses the official inkjs runtime to explore all story paths and build a tree,
 * with several inline optimization passes (loop detection, early deduplication,
 * dialogue-menu hub detection) to keep exploration bounded.
 */
const { Story } = require('inkjs')

const { OPTIMIZATION_PASS_CONFIG, CONFIG, RANDOM_KEYWORD } = require('./configs.js')
const { debugConfig } = require('./debug.js')
const {
  splitCombatNode,
  splitDialogueOnEffects,
  extractEffects,
  cleanText,
} = require('./node-splitting.js')
const {
  detectRandomVariables,
  normalizeRandomEffectsInLine,
  normalizeEffectsArray,
  normalizeKeywordTags,
} = require('./random-support.js')
const { createNode, generateNodeId, resetNodeIdCounter } = require('./tree-utils.js')

// Per-event tree-building state (reset in parseInkStory)
let totalNodesInCurrentEvent = 0
let pathConvergenceStates = new Map() // Track path convergence for early dedup (text + choices)
let hubChoiceSnapshots = new Map() // Track hub choice snapshots: eventName -> { hubNodeId, choiceLabels: Set, threshold }
let dialogueMenuHubIdsByEventName = new Map() // eventName -> hubNodeId (for debugging post-processing)

/**
 * Detect knot definitions in Ink JSON.
 * Knots are named sections of story that can be called dynamically by game commands.
 * Returns a map of knot names to their content arrays.
 *
 * Two layouts exist:
 * - root[2]: used by some events (e.g. Collector) for dynamic branching targets.
 * - root[0] trailing object: many events (e.g. Golden Idol) embed knots in the last
 *   element of the main flow array (keys like disable, take, smash, c-0, g-0).
 * Stitches (e.g. fail, collectorend) are nested inside knot content via {"#n":"name"};
 * the runtime follows diverts like 0.smash.fail when choices are taken, so we don't
 * need to parse #n for tree building.
 */
function detectKnotDefinitions(inkJson) {
  const knots = new Map()

  // 1) root[2] (e.g. Collector: Drakkan, GoldenIdol, Rare, ...)
  if (Array.isArray(inkJson.root) && inkJson.root.length > 2) {
    const definitions = inkJson.root[2]
    if (typeof definitions === 'object' && definitions !== null && !Array.isArray(definitions)) {
      Object.entries(definitions).forEach(([knotName, knotBody]) => {
        if (knotName.startsWith('#')) return
        knots.set(knotName, knotBody)
      })
    }
  }

  // 2) root[0] trailing object (e.g. Golden Idol: disable, take, smash, g-0, c-0, ...)
  if (Array.isArray(inkJson.root) && inkJson.root.length > 0) {
    const flow = inkJson.root[0]
    if (Array.isArray(flow) && flow.length > 0) {
      const last = flow[flow.length - 1]
      if (typeof last === 'object' && last !== null && !Array.isArray(last)) {
        Object.entries(last).forEach(([knotName, knotBody]) => {
          if (knotName.startsWith('#')) return
          if (!knots.has(knotName)) knots.set(knotName, knotBody)
        })
      }
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
  const effects = normalizeEffectsArray(extractedEffects, randomVars)

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
 * Parse a single Ink story and build a hierarchical tree by exploring all paths
 */
function parseInkStory(inkJsonString, eventName) {
  try {
    // Reset counters for each event
    resetNodeIdCounter()
    totalNodesInCurrentEvent = 0
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
      if (eventName === debugConfig.eventName) {
        console.log(`  📊 Random variables: ${varList}`)
      }
    }

    // Log function definitions and calls for all events (for review)
    if (
      (functionDefinitions.size > 0 || functionCalls.size > 0) &&
      eventName === debugConfig.eventName
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

    // Check if we hit the node limit
    if (totalNodesInCurrentEvent >= CONFIG.NODE_BUDGET) {
      console.warn(`  ⚠️  Event "${eventName}" hit node limit - tree may be incomplete`)
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
  pathTextToNodeId = new Map(),
  randomVars = new Map(),
  functionDefinitions = new Map(),
  functionCalls = new Map(),
  knots = new Map()
) {
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
        let normalizedLine = normalizeRandomEffectsInLine(line, randomVars)
        // Normalize keyword tags like [kw:reliable] -> Reliable
        normalizedLine = normalizeKeywordTags(normalizedLine)
        text += (text ? '\n' : '') + normalizedLine.trim()
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

  // TEXT-BASED CYCLE DETECTION (path-scoped - catches same-path loops)
  // If this exact text was seen on the current root-to-leaf path, we have a cycle.
  const textLoopIgnorePatterns = OPTIMIZATION_PASS_CONFIG.TEXT_LOOP_DETECTION_IGNORE_PATTERNS || []
  const textLoopMinLength = OPTIMIZATION_PASS_CONFIG.TEXT_LOOP_DETECTION_MIN_LENGTH || 0
  if (
    OPTIMIZATION_PASS_CONFIG.TEXT_LOOP_DETECTION_ENABLED &&
    cleanedText &&
    cleanedText.length >= textLoopMinLength &&
    !textLoopIgnorePatterns.some((p) => cleanedText.includes(p)) &&
    pathTextToNodeId.has(cleanedText) &&
    type === 'dialogue'
  ) {
    if (eventName === debugConfig.eventName) {
      console.log(`- TEXT-BASED CYCLE detected at state hash: ${currentStateHash}`)
      console.log(`  placing a ref marker on node: ${cleanedText}`)
    }

    const originalNodeId = pathTextToNodeId.get(cleanedText)
    totalNodesInCurrentEvent++
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
    if (eventName === debugConfig.eventName) {
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
  if (totalNodesInCurrentEvent >= CONFIG.NODE_BUDGET) {
    const preview = cleanedText ? cleanedText.substring(0, 50) : '(no text)'
    const choiceCount = choices.length
    console.warn(
      `  ⚠️  Event "${eventName}" reached node limit (${CONFIG.NODE_BUDGET}) at depth ${depth}`
    )
    console.warn(`      Text: "${preview}${cleanedText && cleanedText.length > 50 ? '...' : ''}"`)
    console.warn(`      Choices: ${choiceCount}`)
    return null
  }

  // Clone tracking maps for this branch to maintain separate state per path
  const newVisitedStates = new Set(visitedStates)
  newVisitedStates.add(currentStateHash)
  const newStateToNodeId = new Map(stateToNodeId)
  // pathTextToNodeId is cloned per branch - used for cycle detection on the current root-to-leaf path.
  const newPathTextToNodeId = new Map(pathTextToNodeId)

  // Track ancestor texts (unused but kept for potential future use)
  const newAncestorTexts = cleanedText ? [...ancestorTexts, cleanedText] : ancestorTexts

  // SPECIAL CASE: Check for branching commands BEFORE other early returns
  // Branching commands (like COLLECTOR) trigger exploration of knot definitions
  if (choices.length === 0) {
    const branchingCommand = detectBranchingCommand(effects)

    if (branchingCommand && knots.size > 0) {
      // This is a dynamic branching point - explore all knots as conditional branches
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

  // COMBAT NODE SPLITTING - must happen BEFORE leaf node checks
  // Split combat nodes into combat + postcombat dialogue when postcombat text exists
  // This handles cases like ">>>>COMBAT:Boss\nThe boss falls... You find treasure."
  // IMPORTANT: Only split early for TRUE leaf nodes (no choices), otherwise wait for children to be built
  if (type === 'combat' && text && choices.length === 0) {
    const combatSplitResult = splitCombatNode(
      text,
      type,
      effects,
      [], // children (leaf nodes have no children yet)
      createNode,
      generateNodeId,
      { functionDefinitions, functionCalls }
    )

    // If combat was split (postcombat child was created), return the split structure
    if (combatSplitResult.finalChildren && combatSplitResult.finalChildren.length > 0) {
      totalNodesInCurrentEvent += 2 // Combat node + postcombat child
      return createNode({
        id: generateNodeId(),
        text: combatSplitResult.finalText,
        type: 'combat',
        effects: combatSplitResult.finalEffects,
        children: combatSplitResult.finalChildren,
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

  // Register in path-scoped map immediately (no child sig needed - just tracks the current path for cycle detection)
  if (
    OPTIMIZATION_PASS_CONFIG.TEXT_LOOP_DETECTION_ENABLED &&
    cleanedText &&
    cleanedText.length >= textLoopMinLength &&
    !textLoopIgnorePatterns.some((p) => cleanedText.includes(p))
  ) {
    newPathTextToNodeId.set(cleanedText, nodeId)
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
          if (eventName === debugConfig.eventName) {
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
      if (eventName === debugConfig.eventName) {
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
        if (eventName === debugConfig.eventName) {
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
          newPathTextToNodeId,
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
      newPathTextToNodeId,
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

  // POST-EFFECT DIALOGUE SEPARATION & POSTCOMBAT/AFTERCOMBAT SEPARATION
  // Use helper functions from node-splitting.js
  // These functions split on the ORIGINAL text to find effect markers, but return cleaned text

  // Start with cleaned text as default
  let finalText = cleanedText
  let finalChildren = children
  let finalEffects = effects
  let finalNumContinues = Math.max(0, continueCount - 1)

  // Try dialogue splitting first (for mid-dialogue effects)
  if (type === 'dialogue' && text && effects.length > 0 && continueCount > 1) {
    const dialogueSplitResult = splitDialogueOnEffects(
      text,
      type,
      effects,
      continueCount,
      children,
      createNode,
      generateNodeId,
      { functionDefinitions, functionCalls }
    )

    // If dialogue was split, use the result
    if (dialogueSplitResult.finalChildren !== children) {
      finalText = dialogueSplitResult.finalText
      finalChildren = dialogueSplitResult.finalChildren
      finalEffects = dialogueSplitResult.finalEffects
      finalNumContinues = dialogueSplitResult.finalNumContinues
      totalNodesInCurrentEvent++
    }
  }

  // Try combat splitting (for NON-LEAF combat nodes with choices/children)
  // Note: Leaf combat nodes (no choices) are already handled earlier at line 688
  // This section handles rare cases where combat nodes have choices after them
  if (type === 'combat' && text) {
    const combatSplitResult = splitCombatNode(
      text,
      type,
      finalEffects,
      finalChildren,
      createNode,
      generateNodeId,
      { functionDefinitions, functionCalls }
    )

    // If combat was split (children changed), use the result
    if (combatSplitResult.finalChildren !== children) {
      finalText = combatSplitResult.finalText // Use split result directly, even if undefined
      finalChildren = combatSplitResult.finalChildren
      finalEffects = combatSplitResult.finalEffects
      totalNodesInCurrentEvent++
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
      const safeText = finalText && finalText.trim() !== '' ? finalText : 'default'
      // This node's children match the hub snapshot - convert this node to a ref

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

  const safeText = type === 'combat' && !finalText ? undefined : finalText || 'default'

  // Build the node
  return createNode({
    id: nodeId,
    text: safeText,
    type,
    effects: finalEffects,
    numContinues: finalNumContinues,
    children: finalChildren,
  })
}

/**
 * Extract requirements from choice text and return cleaned text
 * (kept in main file as it's specific to Ink choice parsing)
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

  // Clean up the text (using imported cleanText from node-splitting.js)
  cleanedText = cleanText(cleanedText)

  return { requirements, cleanedText }
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


module.exports = {
  parseInkStory,
  dialogueMenuHubIdsByEventName,
}
