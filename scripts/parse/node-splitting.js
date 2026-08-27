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
 */
const { CARD_ID_COMMANDS } = require('../shared/card-data.js')

const { SPECIAL_KEYWORD_EFFECT_VALUES } = require('./event-overrides.js')
const { recordParseFailure } = require('./debug.js')

/**
 * All `>>>>COMMAND` names seen across the current event data (audited 2026-07-20; DELVEFROMANYPROPERTY,
 * IMBUE, NATHALIMERCHANT and RANDOMEVENT added 2026-07-27 with the Nexus of Nightmares sync;
 * LIGHTLESSTEST, VEILCARD and UNVEILCARD added 2026-08-03 with the Shrine of Night / Shrine of
 * Absence sync — none of them names a knot; VEILCARD/UNVEILCARD only produce an effect label,
 * while LIGHTLESSTEST branches via inline `[?testresult:…]` conditionals, see
 * ENGINE_TEST_COMMANDS). AREASPECIALPERCENT and HARNESSAREASPECIAL added 2026-08-27 with the
 * Campfire sync, which gained the Nexus Corruption choices; neither names a knot, and both
 * only produce an effect label ("AREASPECIALPERCENT: -50:Nexus Corruption").
 * An unrecognized command isn't a hard error — it still renders as "COMMAND: value" — but
 * it's exactly the kind of silent drift (a typo, an upstream rename) spec 6's config-name
 * validation guards against elsewhere, so it's worth surfacing via recordParseFailure.
 *
 * Registering a command only silences that warning; it does not change how the command
 * renders, so the entries above stay in the tree exactly as they were.
 */
const KNOWN_COMMANDS = new Set([
  ...CARD_ID_COMMANDS,
  'ADDCARDBYKEYWORD',
  'ADDCARDBYRARITY',
  'ADDCURSE',
  'ADDEVENTS',
  'ADDKEYWORD',
  'ADDREVELATION',
  'ADDSURGE',
  'ADDTOVAULT',
  'ADDUPGRADEDCARD',
  'ANIMA',
  'AREASPECIAL',
  'AREASPECIALPERCENT',
  'BANDITCARD',
  'BLOODCARD',
  'BUYCARDBYCATEGORY',
  'CAMPFIRE',
  'CARDPUZZLE',
  'CARDREDUCECOST',
  'CHECKSEALS',
  'CLEANSE',
  'COLLECTOR',
  'COMBAT',
  'COMPLETEQUEST',
  'COPYCARD',
  'CORRUPTCARD',
  'DAMAGE',
  'DECOLOR',
  'DELVEFROMANY',
  'DELVEFROMANYPROPERTY',
  'DELVEFROMKEYWORD',
  'DELVEFROMRARITY',
  'DIRECTCOMBAT',
  'DISMISSCOMPANION',
  'ENCHANTERIMBUE',
  'ENDRUN',
  'EVENT',
  'GOLD',
  'GOTOAREA',
  'HARNESSAREASPECIAL',
  'HEAL',
  'HEALPERCENTAGE',
  'IMBUE',
  'IMBUESELECTION',
  'LIGHTLESSTEST',
  'LUCK',
  'MAXHEALTH',
  'MEMORIZE',
  'MERCHANT',
  'MERCHANTDISCOUNT',
  'NATHALIMERCHANT',
  'NEXTAREA',
  'NEXTCARD',
  'NEXTSTATUS',
  'PERSISTENT',
  'PLACEONTOP',
  'QUESTFLAG',
  'RANDOMEVENT',
  'RANDOMIZEENERGY',
  'RANDOMIZEUPGRADES',
  'RELIABLE',
  'RELOADEVENTS',
  'REMOVEAREAEFFECT',
  'REMOVECARDFROMDECK',
  'REMOVECHOSENCARD',
  'REMOVEEVENT',
  'REMOVEIMBUE',
  'REMOVEQUESTFLAG',
  'REMOVERANDOMCARD',
  'REMOVETARGETBASIC',
  'RESETWEAPONPOWER',
  'SCREENSHAKE',
  'SELECTCARD',
  'SETANIMA',
  'SETAREABACKGROUND',
  'SETBACKGROUND',
  'SETBACKGROUNDMUSIC',
  'SETCLASS',
  'SETQUESTPROGRESS',
  'SOULS',
  'STARTTUTORIAL',
  'STORYFUNCTION',
  'SWAPENERGY',
  'SWAPUPGRADES',
  'TAKEFROMVAULT',
  'TRADE',
  'TRANSPOSE',
  'UPGRADE',
  'UPGRADEALLBASICS',
  'UPGRADEALLBYTYPE',
  'UPGRADEALLOFTYPE',
  'UNVEILCARD',
  'UPGRADERANDOMBASIC',
  'UPGRADERANDOMCARDBYRARITY',
  'VEILCARD',
  'VICTORY',
  'WEAPONPOWER',
])

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
 * A command whose colon is followed by nothing (e.g. "DAMAGE:" with an unresolved `{"VAR?":...}`
 * read left behind by a raw, un-executed knot walk) is accepted as a valueless command — recorded
 * via recordParseFailure so it's visible instead of silently vanishing — rather than emitting a
 * dangling "COMMAND: " in the output.
 *
 * @returns {Object} { effects: string[], cleanedText: string }
 */
function extractEffects(
  text,
  functionDefinitions = new Map(),
  functionCalls = new Map(),
  eventName = ''
) {
  if (!text) return { effects: [], cleanedText: '' }

  const effects = []
  let cleaned = text

  // Extract entire command sequences: >>>>COMMAND1:value1;COMMAND2:value2;COMMAND3
  // Pattern matches commands until it hits a character outside the allowed set (like punctuation)
  // Character class structure: letters, digits, underscore, colon, semicolon, quotes, brackets, parens, space, tab, slash, hyphen, ampersand, plus
  // NOTE: Order matters to avoid unintended ranges (e.g., \t\/\- not \t\-\/ which would create ASCII range)
  // `&` and `+` are here solely for the counter-reference value `TRADE:&&malignancies&&+3`
  // (see resolveCounterReferenceValue); without them the match stops at the first `&` and the
  // value falls through into the node's text as a raw codeword.
  const commandSequencePattern = />>>>?[A-Za-z0-9_:;'\[\]\(\) \t\/\-&+]+/gi

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

      const match = cmd.match(/^([A-Za-z_]+)(?::(.*))?$/i)
      if (!match) return

      const command = match[1].toUpperCase()
      const hasColon = match[2] !== undefined
      const value = hasColon ? match[2].trim() : null

      if (hasColon && !value) {
        recordParseFailure(
          'bare-colon command',
          eventName,
          new Error(`"${command}:" had no value after the colon`)
        )
      }

      if (!KNOWN_COMMANDS.has(command)) {
        recordParseFailure(
          'unrecognized command',
          eventName,
          new Error(`"${command}" is not in KNOWN_COMMANDS`)
        )
      }

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
            newEffects = [`${command}: ${resolveCounterReferenceValue(value)}`]
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
 * Split a node's text on `[?condition]` conditional markers into one variant per condition.
 *
 * The game shows exactly ONE of a run of `[?…]` lines, picked from runtime state the Ink
 * runtime can't know (quest flags, and the result of an engine-side test like LIGHTLESSTEST).
 * inkjs therefore emits every variant into the same node, and `cleanText` used to strip the
 * markers and keep the prose — concatenating mutually exclusive outcomes into one passage.
 * Shrine of Absence was the clearest symptom: its three `testresult` outcomes (sealed /
 * worthy / purged) read as a single contradictory paragraph.
 *
 * So each marked line becomes its own child carrying the condition as a requirement, using
 * the same `NOT `-prefix convention as choice requirements (see extractChoiceMetadata in
 * tree-building.js). Unmarked text keeps its place: text before the first marker stays on the
 * parent, and text *after* the last marked line is shared epilogue, so it is appended to every
 * variant rather than being stranded on one of them.
 *
 * A `[?cond]` line whose prose is empty (Spot in the Shade's `[?questflag:quit][continue]`,
 * LostSoul's bare `[?questflag:priest]`) carries no content to branch on, so it is dropped
 * rather than becoming an empty child.
 *
 * @param {string} text - Raw (uncleaned) node text, still containing `[?…]` markers
 * @returns {Object|null} { parentText, variants: [{ requirements, text }], epilogue } or null when
 *   the text has fewer than 2 content-carrying conditional variants (nothing to branch)
 */
function splitTextOnConditionalVariants(text) {
  if (!text || !text.includes('[?')) return null

  // A marker owns everything up to the next marker or the end of the line it started on.
  // Markers always begin a line in the observed data, so line-splitting is the reliable unit.
  const lines = text.split('\n')

  const leadingLines = []
  const variants = []
  const trailingLines = []
  // Effects from a prose-less conditional line whose condition matches no variant — kept on the
  // node rather than silently dropped
  const orphanedEffects = []

  let openVariant = null

  const closeOpenVariant = () => {
    if (!openVariant) return

    // extractEffects rather than cleanText: a variant line can carry a command whose value would
    // otherwise leak in as prose (Alchemist 1's ">>>QUESTFLAG:stormscarredintro").
    const { effects: variantEffects, cleanedText: variantText } = extractEffects(
      openVariant.lines.join('\n')
    )

    if (variantText) {
      variants.push({
        requirements: openVariant.requirements,
        text: variantText,
        effects: variantEffects,
      })
    } else if (variantEffects.length > 0) {
      // A conditional line with a command but NO prose (Alchemist 1's
      // "[?talent:stormscarred;!questflag:stormscarredintro][continue]>>>QUESTFLAG:stormscarredintro")
      // has nothing to branch on, but its effect still only fires under its own condition — so it
      // belongs to the variant sharing that condition, not to the whole node. Left on the node, the
      // flag reads as set for everyone, including players who matched no marker at all, and as being
      // checked by the very children it gates.
      const sameConditionVariant = variants.find(
        (variant) => variant.requirements.join(';') === openVariant.requirements.join(';')
      )

      if (sameConditionVariant) {
        sameConditionVariant.effects = [...sameConditionVariant.effects, ...variantEffects]
      } else {
        orphanedEffects.push(...variantEffects)
      }
    }
    // Otherwise the marker carries neither prose nor effects (Spot in the Shade's bare
    // "[?questflag:quit][continue]", LostSoul's bare marker) — nothing to record
    openVariant = null
  }

  for (const line of lines) {
    const match = line.match(/^\s*\[\?([^\]]+)\]([\s\S]*)$/)

    if (match) {
      closeOpenVariant()

      const ownLine = match[2]

      openVariant = {
        requirements: parseConditionalRequirements(match[1]),
        lines: [ownLine],
        // `[continue]` tells the game engine to pause on this line and then continue into what
        // follows, so a following unmarked line is part of this variant rather than shared
        // epilogue — but only when the marked line actually carries prose of its own. Alchemist 1's
        // "[?…][continue]>>>QUESTFLAG:stormscarredintro" is a bare flag-setting command, and the
        // greeting on the next line is the unconditional default for everyone, not that variant's
        // text. Claiming it produced two variants with identical requirements, one holding prose
        // that isn't conditional at all.
        claimsFollowingLines:
          /\[continue\]/.test(ownLine) && extractEffects(ownLine).cleanedText.length > 0,
      }
      continue
    }

    if (openVariant && openVariant.claimsFollowingLines) {
      openVariant.lines.push(line)
    } else if (variants.length > 0 || openVariant) {
      closeOpenVariant()
      trailingLines.push(line)
    } else {
      leadingLines.push(line)
    }
  }
  closeOpenVariant()

  // One variant is a conditional aside, not a branch — leave it inline as before
  if (variants.length < 2) return null

  // The leading lines are raw, so a `>>>>COMMAND:value` there is still intact. Its effects were
  // already extracted by the caller's extractEffects, but cleanText only strips a command's
  // *bracketed* form — so run the leading text through extractEffects and discard the duplicate
  // effects, keeping just the prose. Otherwise a multi-word value leaks in as text: Vaelmorin's
  // ">>>>ADDTALENT:Clarity of Mind" left the parent reading "of Mind".
  const { cleanedText: parentText } = extractEffects(leadingLines.join('\n'))
  const trailingText = extractEffects(trailingLines.join('\n')).cleanedText

  // Trailing prose is normally a shared epilogue — the scene continuing for everyone, as in Shrine
  // of Absence's "The alcove seals itself…" or Vaelmorin's "That charge I take up again…".
  //
  // But when the marked lines set a quest flag their own conditions gate on, they are alternatives
  // for one slot rather than barks layered onto a shared scene, and the unmarked line is the
  // remaining alternative — the greeting for whoever matched none of them. Appending it to every
  // variant then reads as a double greeting ("Welcome back handsome… Well hello there, adventurer…").
  //
  // It becomes its own sibling with NO requirements: the conditions under which it shows are the
  // negation of all the others, but the Ink never states that, and `[?…]` is the game engine's own
  // mini-language rather than Ink syntax — so there is nothing here that says "default" outright.
  // Alchemist 1 is the only event in the dataset whose conditional lines set a flag they are gated
  // on (audited across all 203 events, 2026-08-03), so this stays a narrow rule.
  // Effects the variants claimed have to be removed from the node's own list, or the same command
  // shows up twice — once on the node and once on the variant that actually gates it
  const claimedEffects = variants.flatMap((variant) => variant.effects || [])

  if (trailingText && marksAlternativesForOneSlot(text)) {
    variants.push({ requirements: [], text: trailingText, effects: [] })

    return {
      parentText,
      parentNumContinues: Math.max(0, countTextLines(parentText) - 1),
      variants,
      epilogue: '',
      claimedEffects,
      orphanedEffects,
    }
  }

  return {
    parentText,
    // Same "one continue between consecutive lines" rule as splitDialogueOnEffects
    parentNumContinues: Math.max(0, countTextLines(parentText) - 1),
    variants,
    epilogue: trailingText,
    claimedEffects,
    orphanedEffects,
  }
}

/**
 * Whether a block's `[?…]` lines are competing alternatives for a single slot rather than barks
 * layered onto a scene that continues for everyone.
 *
 * The tell is a conditional line that sets a quest flag its own siblings' conditions are gated on:
 * Alchemist 1's `[?talent:stormscarred;!questflag:stormscarredintro][continue]`
 * `>>>QUESTFLAG:stormscarredintro` records "the intro has been shown", which only means anything if
 * the marked greetings and the unmarked one are alternatives filling the same slot.
 *
 * Nothing in the compiled Ink states this outright, so this is inference from the flag bookkeeping,
 * not a documented rule — hence the deliberately narrow signal.
 */
function marksAlternativesForOneSlot(text) {
  const gatedFlags = new Set()

  for (const marker of text.matchAll(/\[\?([^\]]+)\]/g)) {
    for (const condition of marker[1].split(';')) {
      const flag = condition.replace(/^!/, '').match(/^questflag:(.+)$/)
      if (flag) gatedFlags.add(flag[1])
    }
  }

  if (gatedFlags.size === 0) return false

  // A QUESTFLAG command on a conditional line, setting one of the flags those lines gate on
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('[?')) continue

    for (const command of line.matchAll(/>>>>?QUESTFLAG:([A-Za-z0-9_]+)/gi)) {
      if (gatedFlags.has(command[1])) return true
    }
  }

  return false
}

/**
 * Count the content-carrying lines of a text block (blank lines don't cost a continue)
 */
function countTextLines(text) {
  if (!text) return 0

  return text.split('\n').filter((line) => line.trim()).length
}

/**
 * Parse a conditional marker's condition string into requirement strings.
 *
 * A marker can carry several semicolon-separated conditions that must ALL hold
 * ("[?testresult:sealed;questflag:nathali]" — the sealed outcome, as commented on by Nathali),
 * and each may be negated with `!` ("[?!questflag:nathali]"), matching choice-label syntax.
 */
function parseConditionalRequirements(conditionString) {
  return conditionString
    .split(';')
    .map((condition) => condition.trim())
    .filter(Boolean)
    .map((condition) => (condition.startsWith('!') ? 'NOT ' + condition.substring(1) : condition))
}

/**
 * Rewrite a `&&counter&&±N` command value into readable prose.
 *
 * The game wraps a runtime counter reference in `&&`, so `TRADE:&&malignancies&&+3` means
 * "trade for (number of malignancies) + 3".
 *
 * The counter name is bracketed verbatim and the offset spaced out ("&&malignancies&&+3" → "[malignancies] + 3").
 * Anything that doesn't match the shape is passed through untouched, so a second,
 * differently-shaped counter would show up as a raw value rather than being silently mangled.
 */
function resolveCounterReferenceValue(value) {
  const match = value.match(/^&&([A-Za-z_]+)&&([+-])(\d+)$/)
  if (!match) return value

  const [, counter, sign, amount] = match

  return `[${counter}] ${sign} ${amount}`
}

/**
 * Resolve ADDKEYWORD effect value, handling variable references and placeholders
 */
function resolveSpecialKeywordEffects(value, functionDefinitions, functionCalls) {
  // Non-literal keyword values (see SPECIAL_KEYWORD_EFFECT_VALUES in event-overrides.js)
  if (SPECIAL_KEYWORD_EFFECT_VALUES[value]) {
    return [...SPECIAL_KEYWORD_EFFECT_VALUES[value]]
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
  cleaned = cleaned.replace(/>>>>?[A-Za-z0-9_:;'\[\]\(\)\t\-\/&+]+;?(?=\n|"| |$)/gi, '')

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
  const DEBUG = false // Set to true to enable debug logging

  if (type !== 'combat' || !text) {
    return { finalText: text, finalChildren: children, finalEffects: effects }
  }

  // Find the COMBAT command in the original text
  // Match COMBAT: with optional leading >>>> (2-4 > characters) or >>> (3 > characters)
  // The pattern [^\n]* matches everything up to but not including the newline
  // Negative lookbehind excludes DIRECTCOMBAT: (a distinct command, handled the same way by
  // extractEffects, but whose "COMBAT:" suffix would otherwise match here too, leaving a
  // dangling "DIRECT" in what this function treats as pre-combat text)
  const combatMatch = text.match(/(>>>+)?(?<!DIRECT)COMBAT:[^\n\r]*/i)

  if (!combatMatch) {
    if (DEBUG) console.log('  [splitCombatNode] No COMBAT command found in text')
    return { finalText: text, finalChildren: children, finalEffects: effects }
  }

  if (DEBUG) {
    console.log('  [splitCombatNode] COMBAT command found:', combatMatch[0])
    console.log('  [splitCombatNode] Combat index:', combatMatch.index)
  }

  const combatIndex = combatMatch.index
  const combatCommandLength = combatMatch[0].length

  // Extract pre-combat and post-combat text
  const preCombatText = text.substring(0, combatIndex).trim()
  const postCombatText = text.substring(combatIndex + combatCommandLength).trim()

  if (DEBUG) {
    console.log('  [splitCombatNode] Pre-combat text length:', preCombatText.length)
    console.log('  [splitCombatNode] Post-combat text length:', postCombatText.length)
  }

  // Extract effects from postcombat text
  const { effects: postCombatEffects, cleanedText: cleanedPostCombatText } = extractEffects(
    postCombatText,
    context.functionDefinitions,
    context.functionCalls,
    context.eventName
  )

  // Clean the pre-combat text
  const { cleanedText: cleanedPreCombatText } = extractEffects(
    preCombatText,
    context.functionDefinitions,
    context.functionCalls,
    context.eventName
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
      context.functionCalls,
      context.eventName
    )

    // Extract post-effect text
    const { effects: postEffects, cleanedText: cleanedPostEffectText } = extractEffects(
      textAfterEffectCommand,
      context.functionDefinitions,
      context.functionCalls,
      context.eventName
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

/**
 * Split a dialogue/end node whose text holds several `[?condition]` variants into
 * one child per variant, each carrying its condition as a requirement.
 *
 * The variants are mutually exclusive outcomes, so the node's original children (and its
 * effects, which produced the outcome — LIGHTLESSTEST is the test whose result is branched on)
 * stay with the parent, and each variant becomes a leaf carrying only its own prose. When the
 * parent has children, the variants sit between parent and children as a fan-out whose branches
 * reconverge, mirroring how the game plays exactly one of them before continuing.
 *
 * See splitTextOnConditionalVariants for the text-level rules.
 *
 * @param {string} text - Raw text containing conditional markers
 * @param {string} type - Node type
 * @param {Array} children - Original children of the node
 * @param {Function} createNode
 * @param {Function} generateNodeId
 * @param {number} [ref] - Cycle-ref target to put on each variant, when the node being split is
 *   itself a ref node (its variants all lead back to the same place)
 * @param {string[]} [effects] - The node's effects, checked for an engine-test command that makes
 *   these variants its reported outcomes (see ENGINE_TEST_COMMANDS)
 * @returns {Object|null} { finalText, finalType?, finalNumContinues, finalChildren } or null when
 *   no split applies. `finalType` is set only when the node becomes a `special` branching point.
 */
function splitNodeOnConditionalVariants(
  text,
  type,
  children,
  createNode,
  generateNodeId,
  ref,
  effects
) {
  if (type !== 'dialogue' && type !== 'end') return null

  const split = splitTextOnConditionalVariants(text)
  if (!split) return null

  // An engine-side test picking between outcomes is the COLLECTOR/CARDPUZZLE shape, so it gets the
  // same `special` → `result` structure (see detectBranchingCommand in tree-building.js). That's
  // also the only rendering path that draws a requirements box on a non-choice node, so it's what
  // makes "why this outcome?" visible in the tree.
  const engineTest = detectEngineTestCommand(effects)

  if (engineTest) {
    return {
      finalText: engineTest,
      finalType: 'special',
      finalNumContinues: undefined,
      finalChildren: buildEngineTestResultNodes(split, engineTest, createNode, generateNodeId),
    }
  }

  // When the split node has choices of its own, the variants are alternative *intro* prose for
  // them (Alchemist 1's three shopkeeper greetings, Spot in the Shade's two arrival lines): the
  // player reads one greeting and then picks from the same menu. Each variant is therefore an
  // additional parent of that shared choice set, marked here and resolved to `refChildren` by
  // `linkConditionalVariantsToSharedChoices` once the pipeline's structural passes have settled —
  // capturing the child ids at this point would leave them stale, since dedup and hub collapse
  // still renumber and replace nodes after tree building.
  //
  // Copying the choices onto every variant instead would put them behind a requirement they don't
  // have — and dedup then collapses the copies, losing choices outright. Leaving the variants as
  // terminal leaves made each greeting look like a dead end while the menu hung off the parent as
  // unrelated siblings.
  const choiceChildren = children || []
  const leadsToSharedChoices = choiceChildren.some((child) => child.choiceLabel !== undefined)

  const variantNodes = split.variants.map((variant) => {
    const variantText = split.epilogue ? `${variant.text} ${split.epilogue}` : variant.text

    const variantNode = createNode({
      id: generateNodeId(),
      text: variantText,
      type: ref !== undefined || leadsToSharedChoices ? 'dialogue' : 'end',
      requirements: variant.requirements,
      effects: variant.effects,
      ref,
    })

    if (leadsToSharedChoices) {
      variantNode.sharesParentChoices = true
    }

    return variantNode
  })

  // A command on a conditional line only fires under that line's condition, so it moves to the
  // variant and comes off the node's own list — see closeOpenVariant in
  // splitTextOnConditionalVariants. Anything the variants didn't claim stays on the node.
  const remainingEffects = (effects || []).filter(
    (effect) => !split.claimedEffects.includes(effect)
  )

  return {
    finalText: split.parentText || undefined,
    finalNumContinues: split.parentNumContinues,
    finalEffects: [...remainingEffects, ...split.orphanedEffects],
    finalChildren: [...variantNodes, ...choiceChildren],
  }
}

/**
 * Resolve the `sharesParentChoices` markers left by splitNodeOnConditionalVariants into
 * `refChildren` pointing at their parent's actual choice nodes.
 *
 * Runs as a late pipeline pass because the ids have to be read *after* dedup, hub collapse and the
 * other structural passes finish moving nodes around — the same markers resolved during tree
 * building produced refChildren pointing at nodes that no longer existed.
 *
 * A marked variant whose parent has no choice children left (a later pass collapsed the menu, as
 * in Shrine of Absence's Investigate branch where the whole node became a loop ref) simply drops
 * the marker: the `ref` it already carries describes where it goes.
 *
 * A choice whose requirements *contradict* the variant's is unreachable from it and is left out of
 * the link — see requirementsContradict.
 *
 * @returns {number} how many variants were linked
 */
function linkConditionalVariantsToSharedChoices(node) {
  if (!node) return 0

  let linkedCount = 0

  const children = node.children || []
  const choiceChildren = children.filter((child) => child.choiceLabel !== undefined)
  const markedVariants = children.filter((child) => child.sharesParentChoices)

  const reachableChoicesFor = (variant) =>
    choiceChildren.filter(
      (choice) => !requirementsContradict(variant.requirements, choice.requirements)
    )

  for (const variant of markedVariants) {
    delete variant.sharesParentChoices

    const reachableChoices = reachableChoicesFor(variant)
    if (reachableChoices.length === 0) continue

    variant.refChildren = reachableChoices.map((choice) => choice.id)
    linkedCount++
  }

  // Every path into the menu goes through a greeting, so the choices must stop being the split
  // node's own children — otherwise it draws its own set of lines to them alongside the greetings',
  // as if the menu were reachable without reading one. They move under one greeting to stay in the
  // hierarchy (the layout needs one real parent to position them); the rest reach them through
  // `refChildren`, which renders identically.
  //
  // The owner has to be a greeting that can reach EVERY choice, since direct children aren't
  // filtered by the contradiction check — picking one that excludes a choice would show it that
  // choice anyway. If no greeting qualifies, they all keep ref links and the choices stay put.
  const owner = markedVariants.find(
    (variant) => reachableChoicesFor(variant).length === choiceChildren.length
  )

  if (owner && choiceChildren.length > 0) {
    owner.children = [...(owner.children || []), ...choiceChildren]
    node.children = children.filter((child) => child.choiceLabel === undefined)

    // The owner reaches its choices as real children now, so the ref links would be duplicates
    const ownerChoiceIds = new Set(choiceChildren.map((choice) => choice.id))
    const remainingRefs = (owner.refChildren || []).filter((id) => !ownerChoiceIds.has(id))
    if (remainingRefs.length > 0) {
      owner.refChildren = remainingRefs
    } else {
      delete owner.refChildren
    }
  }

  for (const child of node.children || []) {
    linkedCount += linkConditionalVariantsToSharedChoices(child)
  }

  return linkedCount
}

/**
 * Whether two requirement lists can never hold at the same time, because one negates a condition
 * the other asserts (`talent:stormscarred` vs `NOT talent:stormscarred`).
 *
 * Deliberately only catches this exact same-key negation. Requirements are opaque game-state
 * strings, so anything subtler — that `gold:20` and `gold:35` are both satisfiable, or whether
 * two different quest flags can co-occur — isn't decidable here, and guessing would drop links
 * that are actually reachable. A direct negation pair is unambiguous: Alchemist's two "Buy a
 * potion" choices are gated `talent:stormscarred` / `!talent:stormscarred`, so the game shows
 * exactly one, and the `talent:stormscarred` greeting can only ever reach the first.
 */
function requirementsContradict(requirementsA, requirementsB) {
  if (!requirementsA || !requirementsB) return false

  const parse = (requirement) =>
    requirement.startsWith('NOT ')
      ? { key: requirement.slice(4), negated: true }
      : { key: requirement, negated: false }

  const parsedA = requirementsA.map(parse)

  return requirementsB
    .map(parse)
    .some((b) => parsedA.some((a) => a.key === b.key && a.negated !== b.negated))
}

/**
 * Commands whose outcome the game engine decides and reports back through a `[?<flag>:<value>]`
 * conditional, mapped to the flag their outcomes are keyed on.
 *
 * These are the inline-conditional counterpart to COLLECTOR/CARDPUZZLE (see
 * detectBranchingCommand in tree-building.js): same "engine picks one of N outcomes" semantics,
 * but the outcomes are conditional *lines in the same container* rather than separate knots, so
 * they can't be found by walking knot definitions.
 */
const ENGINE_TEST_COMMANDS = { LIGHTLESSTEST: 'testresult' }

/**
 * Return the engine-test command name present in a node's effects, or null.
 */
function detectEngineTestCommand(effects) {
  if (!effects || effects.length === 0) return null

  for (const effect of effects) {
    // Engine tests are bare, valueless commands ("LIGHTLESSTEST", not "LIGHTLESSTEST: x")
    const command = effect.toUpperCase().trim()
    if (ENGINE_TEST_COMMANDS[command]) return command
  }

  return null
}

/**
 * Build the `result` children of an engine-test `special` node — one per distinct outcome, in the
 * same `COMMAND: value` requirement format the COLLECTOR/CARDPUZZLE branches use.
 *
 * Variants are grouped by their test outcome rather than mapped one-to-one, because a compound
 * condition adds a *further* condition to an outcome instead of naming a new one: Shrine of
 * Absence's `[?testresult:sealed;questflag:nathali]` is the sealed outcome plus a companion remark
 * shown only when Nathali is in the party. The game prints both lines (there is no negated
 * `!questflag` sibling, which is how this ink writes genuine either/or), so the remark continues
 * the base prose rather than replacing it — and the test has three outcomes, not five.
 *
 * Within an outcome, the unconditional prose comes first and each conditional addition hangs off it
 * as a child carrying its own condition, so no prose is duplicated. Those conditions are visible
 * because dialogue/end nodes render a requirements box too (see `isRequirementsNode`).
 *
 * `ResultNode` carries no text of its own, so the prose always lives in child nodes.
 */
function buildEngineTestResultNodes(split, engineTest, createNode, generateNodeId) {
  const outcomeFlag = ENGINE_TEST_COMMANDS[engineTest]
  const isOutcomeCondition = (requirement) => requirement.startsWith(`${outcomeFlag}:`)

  const formatOutcome = (condition) => `${engineTest}: ${condition.slice(outcomeFlag.length + 1)}`

  // Preserves first-seen outcome order, which is the order the story lists them in
  const outcomeGroups = new Map()

  for (const variant of split.variants) {
    const outcomeConditions = variant.requirements.filter(isOutcomeCondition)
    const outcomeKey = outcomeConditions.join(';')

    if (!outcomeGroups.has(outcomeKey)) {
      outcomeGroups.set(outcomeKey, { outcomeConditions, lines: [] })
    }
    outcomeGroups.get(outcomeKey).lines.push({
      text: variant.text,
      extraConditions: variant.requirements.filter((r) => !isOutcomeCondition(r)),
    })
  }

  return [...outcomeGroups.values()].map(({ outcomeConditions, lines }) => {
    // The epilogue closes the outcome, so it belongs on the deepest (last) line of the chain
    const proseNodes = lines.map((line, index) => {
      const isLastLine = index === lines.length - 1
      const text = isLastLine && split.epilogue ? `${line.text} ${split.epilogue}` : line.text

      return createNode({
        id: generateNodeId(),
        text,
        type: isLastLine ? 'end' : 'dialogue',
        requirements: line.extraConditions,
      })
    })

    // Chain the lines so a conditional addition hangs off the prose it follows
    for (let i = proseNodes.length - 1; i > 0; i--) {
      proseNodes[i - 1].children = [proseNodes[i]]
    }

    return createNode({
      id: generateNodeId(),
      type: 'result',
      requirements: outcomeConditions.map(formatOutcome),
      children: [proseNodes[0]],
    })
  })
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
 * @param {string} eventName - Name of the event being processed (for parse-failure logging)
 * @returns {number} Number of nodes separated
 */
function separateChoicesFromEffects(node, createNode, generateNodeId, eventName = '') {
  if (!node) return 0

  let separatedCount = 0

  // Process children first (bottom-up)
  if (node.children && node.children.length > 0) {
    const newChildren = []

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]

      // Recursively process this child's children
      separatedCount += separateChoicesFromEffects(child, createNode, generateNodeId, eventName)

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
            new Map(),
            eventName
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
// EXPORTS
// ============================================================================

module.exports = {
  // Core splitting functions
  splitCombatNode,
  splitDialogueOnEffects,
  splitNodeOnConditionalVariants,
  linkConditionalVariantsToSharedChoices,
  separateChoicesFromEffects,

  // Helper utilities (exported for testing/reuse)
  extractEffects,
  cleanText,
  resolveSpecialKeywordEffects,
}
