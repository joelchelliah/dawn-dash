/* eslint-disable */
/**
 * Node Splitting and Normalization Utilities
 *
 * This module contains functions for splitting nodes into clearer structures
 * and normalizing node content for better visualization in the event tree.
 *
 * Categories:
 * 1. Combat Splitting: Separates combat nodes into combat + postcombat dialogue
 * 2. Dialogue Splitting: Splits dialogue nodes when effects appear mid-sequence
 * 3. Choice Separation: Separates choice nodes from their outcome/effect nodes
 * 4. Random Value Cleanup: Normalizes random gold/damage values in text
 * 5. Choice Label Normalization: Standardizes labels for random keyword effects
 */

const RANDOM_KEYWORD = '«random»'

/**
 * Extract effects (game commands) from text and clean the text
 *
 * Handles two main patterns:
 * 1. Commands followed by newline: >>>>COMMAND:value\nText continues...
 * 2. Commands with inline prose: >>>>COMMAND:value; The text continues...
 *
 * The semicolon+space pattern ("; ") distinguishes prose from multi-command chains:
 * - "DAMAGE:10; The statue accepts" → DAMAGE effect + "The statue accepts" as text
 * - "GOLD:5;ADDCARD:Shield" → Two effects: GOLD and ADDCARD (no space = chained commands)
 *
 * @returns {Object} { effects: string[], cleanedText: string }
 */
function extractEffects(text, functionDefinitions = new Map(), functionCalls = new Map()) {
  if (!text) return { effects: [], cleanedText: '' }

  const effects = []
  let cleaned = text

  // Extract entire command sequences: >>>>COMMAND1:value1;COMMAND2:value2;COMMAND3
  // Pattern matches commands until it hits a character outside the allowed set (like punctuation)
  // Character class structure: letters, digits, underscore, colon, semicolon, quotes, brackets, parens, space, tab, slash, hyphen
  // NOTE: Order matters to avoid unintended ranges (e.g., \t\/\- not \t\-\/ which would create ASCII range)
  const commandSequencePattern = />>>>?[A-Za-z0-9_:;'\[\]\(\) \t\/\-]+/gi

  cleaned = cleaned.replace(commandSequencePattern, (commandSequence) => {
    let proseAfterCommand = ''
    let actualCommandSequence = commandSequence

    // STRATEGY 1: Check for newline first (most common case - 99% of commands)
    const newlineIndex = commandSequence.indexOf('\n')

    if (newlineIndex !== -1) {
      // Clean case: commands end at newline, prose continues after
      actualCommandSequence = commandSequence.substring(0, newlineIndex)
      proseAfterCommand = commandSequence.substring(newlineIndex + 1)
    } else {
      // STRATEGY 2: No newline - check for "; " (semicolon+SPACE) separator
      // The space distinguishes prose separation from multi-command chains:
      //   - "DAMAGE:10; The statue" → command + prose (has space after semicolon)
      //   - "GOLD:5;ADDCARD:x" → multiple commands (no space after semicolon)
      const semicolonSpaceIndex = commandSequence.indexOf('; ')

      if (semicolonSpaceIndex !== -1) {
        // Split at "; " - everything after is prose, not part of the command
        actualCommandSequence = commandSequence.substring(0, semicolonSpaceIndex)
        proseAfterCommand = commandSequence.substring(semicolonSpaceIndex + 2) // +2 to skip "; "
      }
      // else: No newline, no "; " - entire sequence is commands
    }

    const commands = actualCommandSequence.split(';')

    commands.forEach((cmd) => {
      cmd = cmd.replace(/^>>>+/, '').trim()
      if (!cmd) return

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

    // Return the prose text that followed the command (if any)
    return proseAfterCommand
  })

  // Remove any leftover semicolons and clean up spacing
  cleaned = cleaned.replace(/;+/g, ';').replace(/^[;\s]+|[;\s]+$/g, '')

  const cleanedText = cleanText(cleaned)

  return { effects, cleanedText }
}

/**
 * Resolve ADDKEYWORD effect value, handling variable references and placeholders
 */
function resolveSpecialKeywordEffects(value, functionDefinitions, functionCalls) {
  // See Shrine of Trickery
  if (value === 'a keyword') {
    return ['ADDKEYWORD: random']
  }

  // See Shrine of Trickery
  if (value === 'chaos') {
    return ['ADDKEYWORD: random', 'ADDKEYWORD: random', 'ADDTYPE: Corruption', 'SWAPCOST: blood']
  }

  // See Shrine of Trickery
  for (const functionName of functionCalls.values()) {
    const returnValues = functionDefinitions.get(functionName)
    if (returnValues && returnValues.length > 0 && returnValues.includes(value)) {
      return [`ADDKEYWORD: random [${returnValues.join(', ')}]`]
    }
  }

  return [`ADDKEYWORD: ${value}`]
}

/**
 * Clean text by removing Ink/game-specific markup
 *
 * Note: Game commands (>>>>COMMAND) should be removed by extractEffects() before cleanText() is called.
 * However, we still include fallback cleanup here for edge cases where commands slip through.
 */
function cleanText(text) {
  if (!text) return ''

  let cleaned = text

  // Fallback: Remove any game commands that weren't caught by extractEffects
  // This handles edge cases where commands appear in text that wasn't fully processed by extractEffects
  // Pattern: matches command sequences until hitting: newline, quote, space (after optional semicolon), or end
  // Examples: ">>>>DAMAGE:10; text" → "text",  "\n>>>>GOLD:50\ntext" → "\ntext"
  cleaned = cleaned.replace(/>>>>?[A-Za-z0-9_:;'\[\]\(\)\t\-\/]+;?(?=\n|"| |$)/gi, '')

  // Remove color tags
  cleaned = cleaned.replace(/<color=[^>]+>/gi, '').replace(/<\/color[^>]*>/gi, '')

  // Remove HTML tags
  cleaned = cleaned.replace(/<\/?[bi]>/gi, '').replace(/<\/?b>/gi, '')

  // Remove speaker tags
  cleaned = cleaned.replace(/\{#[^}]+\}/g, '')

  // Remove conditional text markers
  cleaned = cleaned.replace(/\[\?[^\]]+\]/g, '')

  // Remove [continue] markers
  cleaned = cleaned.replace(/\[continue\]/gi, '')

  // Remove leftover command brackets
  cleaned = cleaned.replace(/\[(DAMAGE|GOLD|HEALTH|Health|Gold):[^\]]+\];?\s*/gi, '')

  // Remove newline escapes
  cleaned = cleaned.replace(/\\n/g, ' ')

  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ')

  return cleaned.trim()
}

// ============================================================================
// 1. COMBAT SPLITTING
// ============================================================================

/**
 * Split combat nodes into combat + postcombat dialogue
 *
 * Combat nodes may have postcombat/aftercombat dialogue that should be in a separate child node.
 * The raw text from Ink contains: [precombat text]\n>>>COMBAT:Enemy\n[postcombat text]
 *
 * We need to:
 * 1. Keep precombat text in the combat node
 * 2. Move postcombat text to a new dialogue child node
 * 3. Move all original children to that dialogue node
 *
 * This splitting happens during tree building (in buildTreeFromStory).
 *
 * @param {string} text - Raw text containing combat command and dialogue
 * @param {string} type - Node type ('combat' expected)
 * @param {Array} effects - Extracted effects from the node
 * @param {Array} children - Original children of the combat node
 * @param {Function} createNode - Function to create new nodes
 * @param {Function} generateNodeId - Function to generate unique node IDs
 * @param {Object} context - Context object with functionDefinitions, functionCalls
 * @returns {Object} { finalText, finalChildren, finalEffects } - Updated node properties
 */
function splitCombatNode(text, type, effects, children, createNode, generateNodeId, context) {
  if (type !== 'combat' || !text) {
    return { finalText: text, finalChildren: children, finalEffects: effects }
  }

  // Find the COMBAT command in the original text
  const combatMatch = text.match(/(>>>+)?COMBAT:[^\n]*/i)

  if (!combatMatch) {
    return { finalText: text, finalChildren: children, finalEffects: effects }
  }

  const combatIndex = combatMatch.index
  const combatCommandLength = combatMatch[0].length

  // Extract pre-combat and post-combat text
  const preCombatText = text.substring(0, combatIndex).trim()
  const postCombatText = text.substring(combatIndex + combatCommandLength).trim()

  // Extract effects from postcombat text
  const { effects: postCombatEffects, cleanedText: cleanedPostCombatText } = extractEffects(
    postCombatText,
    context.functionDefinitions,
    context.functionCalls
  )

  // Clean the pre-combat text
  const { cleanedText: cleanedPreCombatText } = extractEffects(
    preCombatText,
    context.functionDefinitions,
    context.functionCalls
  )

  // If there's postcombat text, create a dialogue child node
  if (cleanedPostCombatText && cleanedPostCombatText.trim()) {
    const postcombatNode = createNode({
      id: generateNodeId(),
      text: cleanedPostCombatText,
      type: children.length > 0 ? 'dialogue' : 'end',
      effects: postCombatEffects.length > 0 ? postCombatEffects : undefined,
      children: children.length > 0 ? children : undefined,
    })

    // Update final values: combat node gets pre-combat text, single child is postcombat node
    return {
      finalText: cleanedPreCombatText || undefined,
      finalChildren: [postcombatNode],
      finalEffects: effects.filter((e) => e.includes('COMBAT:')), // Keep only combat effects
    }
  }

  // No postcombat text, just use pre-combat text
  return {
    finalText: cleanedPreCombatText || undefined,
    finalChildren: children,
    finalEffects: effects,
  }
}

// ============================================================================
// 2. DIALOGUE SPLITTING ON EFFECTS
// ============================================================================

/**
 * Split dialogue nodes when effects appear mid-sequence
 *
 * Similar to combat/postcombat splitting, we need to handle dialogue sequences where
 * effects appear in the MIDDLE of the dialogue (not at the beginning).
 *
 * Example: "dialogue 1\ndialogue 2\n>>>>GOLD:50\ndialogue 3\ndialogue 4"
 * Should become:
 *   - Node with "dialogue 1\ndialogue 2" + GOLD effect + numContinues=1
 *     -> Child node with "dialogue 3\ndialogue 4" + numContinues=1
 *
 * This prevents merging all dialogue together which hides when effects occur.
 *
 * This splitting happens during tree building (in buildTreeFromStory).
 *
 * @param {string} text - Raw text containing dialogue and effects
 * @param {string} type - Node type ('dialogue' expected)
 * @param {Array} effects - Extracted effects from the node
 * @param {number} continueCount - Number of Continue() calls made
 * @param {Array} children - Original children of the dialogue node
 * @param {Function} createNode - Function to create new nodes
 * @param {Function} generateNodeId - Function to generate unique node IDs
 * @param {Object} context - Context object with functionDefinitions, functionCalls
 * @returns {Object} { finalText, finalChildren, finalEffects, finalNumContinues } - Updated node properties
 */
function splitDialogueOnEffects(
  text,
  type,
  effects,
  continueCount,
  children,
  createNode,
  generateNodeId,
  context
) {
  if (type !== 'dialogue' || !text || effects.length === 0 || continueCount <= 1) {
    const numContinues = Math.max(0, continueCount - 1)
    return {
      finalText: text,
      finalChildren: children,
      finalEffects: effects,
      finalNumContinues: numContinues,
    }
  }

  // Find the FIRST effect command in the original text (but not COMBAT)
  const firstEffectMatch = text.match(/>>>>?(?!COMBAT)[A-Za-z0-9_:;'\[\]\(\)  \t\-\/]+/i)

  if (!firstEffectMatch) {
    const numContinues = Math.max(0, continueCount - 1)
    return {
      finalText: text,
      finalChildren: children,
      finalEffects: effects,
      finalNumContinues: numContinues,
    }
  }

  const effectIndex = firstEffectMatch.index

  // Check if there's dialogue text BEFORE the effect
  const textBeforeEffect = text.substring(0, effectIndex).trim()
  const textAfterEffectCommand = text.substring(effectIndex + firstEffectMatch[0].length).trim()

  // Count newlines before the effect to estimate numContinues for first part
  const linesBeforeEffect = textBeforeEffect.split('\n').filter((l) => l.trim()).length

  // Only split if there's both dialogue before AND after the effect
  if (textBeforeEffect && textAfterEffectCommand && linesBeforeEffect > 0) {
    // Extract the text with effect command for proper effect extraction
    const textWithEffect = text.substring(0, effectIndex + firstEffectMatch[0].length)
    const { effects: effectsBeforePost, cleanedText: cleanedTextBeforePost } = extractEffects(
      textWithEffect,
      context.functionDefinitions,
      context.functionCalls
    )

    // Extract post-effect text
    const { effects: postEffects, cleanedText: cleanedPostEffectText } = extractEffects(
      textAfterEffectCommand,
      context.functionDefinitions,
      context.functionCalls
    )

    // Calculate numContinues for each part
    const continuesBeforeEffect = Math.max(0, linesBeforeEffect - 1)
    const linesAfterEffect = cleanedPostEffectText.split('\n').filter((l) => l.trim()).length
    const continuesAfterEffect = Math.max(0, linesAfterEffect - 1)

    // Create a child node for the post-effect dialogue
    if (cleanedPostEffectText && cleanedPostEffectText.trim()) {
      const postEffectNode = createNode({
        id: generateNodeId(),
        text: cleanedPostEffectText,
        type: children.length > 0 ? 'dialogue' : 'end',
        effects: postEffects.length > 0 ? postEffects : undefined,
        numContinues: continuesAfterEffect > 0 ? continuesAfterEffect : undefined,
        children: children.length > 0 ? children : undefined,
      })

      // Update final values: current node gets pre-effect text + effects
      return {
        finalText: cleanedTextBeforePost || undefined,
        finalChildren: [postEffectNode],
        finalEffects: effectsBeforePost,
        finalNumContinues: continuesBeforeEffect > 0 ? continuesBeforeEffect : undefined,
      }
    }
  }

  const numContinues = Math.max(0, continueCount - 1)
  return {
    finalText: text,
    finalChildren: children,
    finalEffects: effects,
    finalNumContinues: numContinues,
  }
}

// ============================================================================
// 3. CHOICE SEPARATION
// ============================================================================

/**
 * Separate choices from their effects for clearer visualization
 *
 * When a node has both a choiceLabel and effects/children, split it into:
 * 1. A choice node (with choiceLabel and requirements)
 * 2. An outcome node (with effects and/or children)
 *
 * This creates a consistent structure where choices are always represented as
 * separate nodes from their outcomes, making the tree easier to visualize.
 *
 * This is run as a post-processing pass after tree building.
 *
 * @param {Object} node - The node to process
 * @param {Function} createNode - Function to create new nodes with consistent field ordering
 * @param {Function} generateNodeId - Function to generate unique node IDs
 * @returns {number} Number of nodes separated
 */
function separateChoicesFromEffects(node, createNode, generateNodeId) {
  if (!node) return 0

  let separatedCount = 0

  // Process children first (bottom-up)
  if (node.children && node.children.length > 0) {
    const newChildren = []

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]

      // Recursively process this child's children
      separatedCount += separateChoicesFromEffects(child, createNode, generateNodeId)

      // Check if this child needs to be split
      const hasChoiceLabel = child.choiceLabel && child.choiceLabel.trim()
      const hasEffects = child.effects && child.effects.length > 0
      const hasSubstantialText = child.text && child.text.trim() && child.text !== '[End]'
      const isEndNode = child.type === 'end'
      const isSpecialNode = child.type === 'special'
      const shouldSplit =
        hasChoiceLabel &&
        !isSpecialNode &&
        (hasEffects ||
          hasSubstantialText ||
          (child.children && child.children.length > 0) ||
          isEndNode)

      if (shouldSplit) {
        // Create a choice node (parent)
        const choiceNode = createNode({
          id: child.id,
          text: undefined,
          type: 'choice',
          choiceLabel: child.choiceLabel,
          requirements: child.requirements,
        })

        // Determine the outcome type
        const hasChildren = child.children && child.children.length > 0
        const hasRef = child.ref !== undefined
        let outcomeType
        if (child.type === 'combat') {
          outcomeType = 'combat'
        } else if (hasRef) {
          outcomeType = child.type
        } else if (!hasChildren) {
          outcomeType = 'end'
        } else if (child.type === 'choice' || child.type === 'dialogue') {
          outcomeType = 'dialogue'
        } else {
          console.warn('  ⚠️ Unexpected node split! Type: ', child.type, 'Node: ', child)
          outcomeType = child.type
        }

        // Create an outcome node (child)
        // Re-extract effects from child text in case some were missed during initial parsing
        // This can happen when commands appear mid-line with text (e.g., ">>>>DAMAGE:10; text")
        const childTextHasCommands = />>{2,}[A-Z_]+/.test(child.text || '')
        let outcomeText = child.text || ''
        let outcomeEffects = child.effects || []

        if (childTextHasCommands) {
          // Re-run extractEffects to capture any missed commands
          const { effects: extractedEffects, cleanedText } = extractEffects(
            child.text,
            new Map(),
            new Map()
          )
          outcomeText = cleanedText || cleanText(child.text)
          // Merge extracted effects with existing effects
          outcomeEffects = [...(child.effects || []), ...extractedEffects]
        } else {
          // Just clean the text without re-extracting
          outcomeText = cleanText(child.text || '')
        }

        const outcomeNode = createNode({
          id: generateNodeId(),
          text: outcomeText,
          type: outcomeType,
          effects: outcomeEffects,
          numContinues: child.numContinues,
          ref: child.ref,
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

// ============================================================================
// 4. RANDOM VALUE CLEANUP
// ============================================================================

/**
 * Clean up random gold/damage values in text
 *
 * For nodes whose effects contain "GOLD: random [min - max]" or "DAMAGE: random [min - max]",
 * replace numeric gold/damage in node.text (e.g. "47 gold", "5 damage") with «random» gold/damage.
 *
 * This ensures the text accurately reflects that the value is random, not a specific number.
 *
 * Special handling for split dialogue: if a node has random effects and a single dialogue child,
 * the child may contain the gold/damage text that was split from the parent. In this case,
 * we clean up the child's text AND migrate the random effect to the child node.
 *
 * This is run as a post-processing pass after all tree building and optimization.
 *
 * @param {Array} eventTrees - Array of event trees to process
 * @returns {number} Number of nodes updated
 */
function cleanUpRandomValues(eventTrees) {
  const goldRandomEffectRe = /^GOLD:\s*random\s*\[\s*(\d+)\s*-\s*(\d+)\s*\]$/i
  const damageRandomEffectRe = /^DAMAGE:\s*random\s*\[\s*(\d+)\s*-\s*(\d+)\s*\]$/i
  const goldInTextRe = /\b(\d+)\s*(gold)\b/gi
  const damageInTextRe = /\b(\d+)\s*(damage)\b/gi
  let updated = 0

  function visit(node) {
    if (!node) return

    // Track random effects found in this node
    let goldRange = null
    let damageRange = null

    if (node.effects && Array.isArray(node.effects) && node.text) {
      let newText = node.text
      for (const effect of node.effects) {
        const goldM = String(effect).match(goldRandomEffectRe)
        if (goldM) {
          const min = parseInt(goldM[1], 10)
          const max = parseInt(goldM[2], 10)
          goldRange = { min, max }
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
          damageRange = { min, max }
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

    // Handle split dialogue: migrate random effects to child node if needed
    if ((goldRange || damageRange) && node.children && node.children.length === 1) {
      const child = node.children[0]
      if (child.type === 'dialogue' && child.text) {
        let childNewText = child.text
        let childNewEffects = []

        if (goldRange) {
          childNewText = childNewText.replace(goldInTextRe, (_, numStr, word) => {
            const n = parseInt(numStr, 10)
            return n >= goldRange.min && n <= goldRange.max
              ? `${RANDOM_KEYWORD} ${word}`
              : `${numStr} ${word}`
          })
          childNewEffects = [
            ...childNewEffects,
            `GOLD: random [${goldRange.min} - ${goldRange.max}]`,
          ]
        }

        if (damageRange) {
          childNewText = childNewText.replace(damageInTextRe, (_, numStr, word) => {
            const n = parseInt(numStr, 10)
            return n >= damageRange.min && n <= damageRange.max
              ? `${RANDOM_KEYWORD} ${word}`
              : `${numStr} ${word}`
          })
          childNewEffects = [
            ...childNewEffects,
            `DAMAGE: random [${damageRange.min} - ${damageRange.max}]`,
          ]
        }

        if (childNewText !== child.text) {
          child.text = childNewText
          child.effects = [...(child.effects || []), ...childNewEffects]
          node.effects = node.effects.filter((e) => !childNewEffects.includes(e))
          updated++
        }
      }
    }

    if (node.children) node.children.forEach(visit)
  }

  eventTrees.forEach((tree) => tree.rootNode && visit(tree.rootNode))
  return updated
}

// ============================================================================
// 5. CHOICE LABEL NORMALIZATION
// ============================================================================

const ADDKEYWORD_RANDOM_LIST_RE = /ADDKEYWORD:\s*random\s*\[/

/**
 * Normalize ADDKEYWORD random choice labels
 *
 * When a choice node's only child has effect "ADDKEYWORD: random [A, B, C, ...]",
 * set the choice's label to "Add «random»" (the label was one specific keyword from the list).
 *
 * This runs after separateChoicesFromEffects so structure is choice -> outcome node with effects.
 *
 * @param {Object} node - The node to process
 * @returns {Object} Stats object with { updated: number }
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

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core splitting functions
  splitCombatNode,
  splitDialogueOnEffects,
  separateChoicesFromEffects,

  // Normalization functions
  cleanUpRandomValues,
  normalizeAddKeywordRandomChoiceLabels,

  // Helper utilities (exported for testing/reuse)
  extractEffects,
  cleanText,
  resolveSpecialKeywordEffects,

  // Constants
  RANDOM_KEYWORD,
  ADDKEYWORD_RANDOM_LIST_RE,
}
