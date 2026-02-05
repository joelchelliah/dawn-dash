/* eslint-disable */
/**
 * Random Value Support Utilities
 *
 * This module handles detection and normalization of random GOLD/DAMAGE values throughout the parsing pipeline:
 * 1. Detection: Extracts random variable ranges from Ink JSON (e.g., VAR damage = RANDOM(5, 15))
 * 2. During tree building: Normalizes commands like "GOLD:47" to "GOLD: random [min - max]"
 * 3. During post-processing: Replaces numeric values in text (e.g., "47 gold") with "«random» gold"
 *
 * The multi-phase approach ensures:
 * - Random ranges are detected from Ink source before story execution
 * - Effects are standardized during parsing for consistent deduplication
 * - Text is cleaned up after all tree transformations are complete
 */

const RANDOM_KEYWORD = '«random»'

// ============================================================================
// 1. RANDOM VARIABLE DETECTION
// ============================================================================

/**
 * Detect random variable assignments in Ink JSON
 *
 * Searches for the pattern: ["ev", minValue, maxValue, "rnd", "/ev", {"VAR=": "varName"}]
 * which represents: VAR = random(min, max) in Ink source code
 *
 * Multiple ranges per variable are supported (e.g., for branching paths with different random ranges)
 *
 * @param {string} inkJsonString - Stringified Ink JSON to parse
 * @returns {Map<string, Array<{min: number, max: number}>>} Map of variable names to their random ranges
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

// ============================================================================
// 2. INLINE NORMALIZATION (DURING TREE BUILDING)
// ============================================================================

/**
 * Get random ranges for a variable name (case-insensitive)
 * @param {Map} randomVars - Map of variable names to their random ranges
 * @param {string} varName - Variable name to look up (e.g., 'gold', 'damage')
 * @returns {Array|undefined} Array of {min, max} ranges or undefined
 */
function getRandomRanges(randomVars, varName) {
  return (
    randomVars.get(varName) || randomVars.get(varName.charAt(0).toUpperCase() + varName.slice(1))
  )
}

/**
 * Normalize numeric effect commands in a line of text
 * Converts "COMMAND:value" to "COMMAND:random [min - max]" when value falls within a random range
 *
 * Used during tree building to standardize effects before extraction.
 *
 * @param {string} line - Line of text containing effect commands
 * @param {string} commandKey - Command name (e.g., 'GOLD', 'DAMAGE')
 * @param {string} varName - Variable name in randomVars (e.g., 'gold', 'damage')
 * @param {Map} randomVars - Map of variable names to their random ranges
 * @returns {string} Modified line with normalized commands
 */
function normalizeNumericEffectInLine(line, commandKey, varName, randomVars) {
  let modifiedLine = line
  const re = new RegExp(`${commandKey}:(\\d+)`, 'gi')
  const ranges = getRandomRanges(randomVars, varName)
  if (!ranges) return line

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

  return modifiedLine
}

/**
 * Normalize random GOLD/DAMAGE commands in a line of text
 * Handles both GOLD and DAMAGE effects that fall within random ranges.
 *
 * This is called during tree building (in buildTreeFromStory) to normalize
 * commands BEFORE extractEffects() processes them.
 *
 * @param {string} line - Line of text containing effect commands
 * @param {Map} randomVars - Map of variable names to their random ranges
 * @returns {string} Modified line with normalized commands, or original line if no changes
 */
function normalizeRandomEffectsInLine(line, randomVars) {
  if (!randomVars || randomVars.size === 0 || !line.includes('>>>>')) {
    return line
  }

  let modifiedLine = line

  if (/GOLD:\d+/.test(line)) {
    modifiedLine = normalizeNumericEffectInLine(modifiedLine, 'GOLD', 'gold', randomVars)
  }

  if (/DAMAGE:\d+/.test(line)) {
    modifiedLine = normalizeNumericEffectInLine(modifiedLine, 'DAMAGE', 'damage', randomVars)
  }

  return modifiedLine
}

/**
 * Normalize effects array by replacing numeric GOLD/DAMAGE with random ranges
 * Used for knot content parsing where effects are already extracted.
 *
 * @param {Array} effects - Array of effect strings
 * @param {Map} randomVars - Map of variable names to their random ranges
 * @returns {Array} Normalized effects array
 */
function normalizeEffectsArray(effects, randomVars) {
  if (!randomVars || randomVars.size === 0 || !effects || effects.length === 0) {
    return effects
  }

  return effects.map((effect) => {
    const s = String(effect)

    // Check for GOLD effects
    const goldMatch = s.match(/^GOLD:\s*(\d+)$/i)
    if (goldMatch) {
      const value = parseInt(goldMatch[1], 10)
      const ranges = randomVars.get('gold')
      const r = ranges && ranges.find((range) => value >= range.min && value <= range.max)
      return r ? `GOLD: random [${r.min} - ${r.max}]` : effect
    }

    // Check for DAMAGE effects
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

// ============================================================================
// 3. POST-PROCESSING PASSES
// ============================================================================

/**
 * Normalize ADDKEYWORD random choice labels (POST-PROCESSING PASS)
 *
 * When a choice node's only child has effect "ADDKEYWORD: random [A, B, C, ...]",
 * set the choice's label to "Add «random»" (the label was one specific keyword from the list).
 *
 * This runs after separateChoicesFromEffects so structure is choice -> outcome node with effects.
 *
 * @param {Object} node - The node to process
 * @param {Object} stats - Stats object to track updates (default: { updated: 0 })
 * @returns {Object} Stats object with { updated: number }
 */
function normalizeAddKeywordRandomChoiceLabels(node, stats = { updated: 0 }) {
  if (!node) return stats

  if (node.type === 'choice' && node.children?.length === 1) {
    const child = node.children[0]
    const effects = child.effects
    const ADDKEYWORD_RANDOM_LIST_RE = /ADDKEYWORD:\s*random\s*\[/

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
 * Clean up random gold/damage values in text (POST-PROCESSING PASS)
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
// EXPORTS
// ============================================================================

module.exports = {
  // Detection
  detectRandomVariables,

  // During tree building (inline normalization)
  normalizeRandomEffectsInLine,
  normalizeNumericEffectInLine,
  normalizeEffectsArray,

  // Post-processing passes
  cleanUpRandomValues,
  normalizeAddKeywordRandomChoiceLabels,

  // Constant
  RANDOM_KEYWORD,
}
