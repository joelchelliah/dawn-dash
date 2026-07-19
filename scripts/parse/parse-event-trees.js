/**
 * Entry point for parsing Ink JSON from events into hierarchical tree structures.
 *
 * Reads scripts/data/events.json, builds one tree per event using the inkjs runtime
 * (see tree-building.js), runs the post-processing PIPELINE defined below, and writes
 * the result to src/codex/data/event-trees.json.
 *
 * Module layout:
 * - tree-building.js     Ink story exploration -> raw event trees
 * - tree-utils.js        node creation, id generation, generic tree helpers
 * - node-splitting.js    combat/dialogue/choice node splitting + effect extraction
 * - random-support.js    random value detection and normalization
 * - ref-normalization.js ref rewrites (choice wrappers, split combat nodes, hub promotion)
 * - deduplication.js     structural subtree deduplication
 * - ref-children.js      sibling/cousin ref -> refChildren conversion
 * - misc-passes.js       invalid-ref check, card-id replacement, default-node filtering
 * - apply-event-alterations.js  manual per-event fixes (data in event-alterations.js)
 * - parse-validation.js  output diff validation against a baseline
 * - configs.js           pass toggles and per-event special-casing
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const { readOrFetchIdToNameMapping } = require('../shared/card-data.js')

/**
 * Suppress the inkjs ink-version warning, which is otherwise printed once per parsed
 * event (hundreds of lines): our events are compiled as ink v21, inkjs (pinned in
 * package.json) supports v20 but handles them fine. Remove this once an inkjs release
 * supports v21. All other console.warn calls pass through untouched.
 */
function suppressInkjsVersionWarning() {
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (args[0]?.includes('Version of ink')) return
    originalWarn.apply(console, args)
  }
}
suppressInkjsVersionWarning()

const EVENTS_FILE = path.join(__dirname, '../data/events.json')
const OUTPUT_FILE = path.join(__dirname, '../../src/codex/data/event-trees.json')
const { OPTIMIZATION_PASS_CONFIG } = require('./configs.js')
const {
  DEFAULT_NODE_BLACKLIST,
  EVENT_NAME_ALIASES,
  EVENT_ALTERATIONS,
} = require('./event-overrides.js')
const { validateEventConfigs } = require('./config-validation.js')
const { applyEventAlterations } = require('./apply-event-alterations.js')
const { validateEventTreesChanges } = require('./parse-validation.js')
const { separateChoicesFromEffects } = require('./node-splitting.js')
const {
  cleanUpRandomValues,
  normalizeAddKeywordRandomChoiceLabels,
} = require('./random-support.js')
const { debugConfig, printParseFailureSummary } = require('./debug.js')
const { parseInkStory, dialogueMenuHubIdsByEventName } = require('./tree-building.js')
const {
  createNode,
  generateNodeId,
  countNodes,
  buildNodeMapForTree,
  findInvalidRefsInTree,
} = require('./tree-utils.js')
const {
  normalizeRefsPointingToChoiceNodes,
  normalizeRefsPointingToCombatNodes,
  promoteShallowDialogueMenuHub,
} = require('./ref-normalization.js')
const { deduplicateAllTrees } = require('./deduplication.js')
const {
  convertSiblingAndCousinRefsToRefChildren,
  hoistPureStandInRefNodes,
} = require('./ref-children.js')
const { checkInvalidRefs, replaceCardIdsInNode, filterDefaultNodes } = require('./misc-passes.js')
const {
  detectAndOptimizeDialogueMenuHubs,
} = require('./post-processing-hub-pattern-optimization.js')

/**
 * CLI flags:
 *   --debug "<event name>"   Enable detailed logging for a specific event
 *   --only "<event name>"    Parse just this event and merge it into the existing output file
 *   --dry-run                Parse + validate, but don't write the output file
 *   --baseline <file>        Validate against this snapshot file instead of git HEAD
 */
function parseCliArgs(argv) {
  const args = { debugEventName: '', only: null, dryRun: false, baseline: null }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--debug') {
      args.debugEventName = argv[++i] || ''
    } else if (arg === '--only') {
      args.only = argv[++i] || null
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--baseline') {
      args.baseline = argv[++i] || null
    } else {
      console.error(`❌ Unknown argument: ${arg}`)
      console.error(
        'Usage: node parse-event-trees.js [--debug <event>] [--only <event>] [--dry-run] [--baseline <file>]'
      )
      process.exit(1)
    }
  }
  if (args.baseline && !fs.existsSync(args.baseline)) {
    console.error(`❌ Baseline file not found: ${args.baseline}`)
    process.exit(1)
  }
  return args
}

const CLI_ARGS = parseCliArgs(process.argv.slice(2))

// Enables detailed logging for a specific event, when provided (via --debug "<event name>").
// Shared with the other parse modules through debug.js.
debugConfig.eventName = CLI_ARGS.debugEventName

/**
 * Log tree state for the --debug event between pipeline passes
 */
function debugCheckEventPipelineState(eventTrees, stageLabel) {
  if (typeof debugConfig.eventName !== 'string' || !debugConfig.eventName) return
  const debugTree = eventTrees.find((t) => t.name === debugConfig.eventName)
  if (!debugTree?.rootNode) return

  const nodeMap = buildNodeMapForTree(debugTree.rootNode)
  const invalidRefs = findInvalidRefsInTree(debugTree.rootNode, nodeMap)

  const hubId = dialogueMenuHubIdsByEventName.get(debugConfig.eventName)
  const hubStatus = hubId != null ? (nodeMap.has(hubId) ? 'present' : 'MISSING') : 'n/a'

  console.log(
    `  🧪 [${debugConfig.eventName}] ${stageLabel}: nodes=${nodeMap.size}, hubId=${hubId ?? 'n/a'} (${hubStatus}), invalidRefs=${invalidRefs.length}`
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
 * Check if a string is in human-readable format (has spaces and not camelCase/PascalCase)
 */
function isHumanReadable(str) {
  if (!str) return false

  // Has spaces - likely human readable
  if (str.includes(' ')) return true

  // Capital in the middle or end (spaces already handled above) → camel/Pascal
  if (/[A-Z]/.test(str.slice(1))) return false

  // Otherwise, consider it human readable
  return true
}

/**
 * Determine the display name and alias based on human readability
 */
function determineNameAndAlias(name, caption) {
  if (name === caption) {
    return { displayName: name, alias: null }
  }

  const nameReadable = isHumanReadable(name)
  const captionReadable = isHumanReadable(caption)

  if (nameReadable && captionReadable && caption) {
    return { displayName: caption, alias: name }
  }
  if (!nameReadable && captionReadable && caption) {
    return { displayName: caption, alias: null }
  }
  if (nameReadable && !captionReadable) {
    return { displayName: name, alias: EVENT_NAME_ALIASES[name] || null }
  }
  return { displayName: caption || name, alias: null }
}

/**
 * POST-PROCESSING PIPELINE
 *
 * The single source of truth for pass order, enablement, and logging.
 * Each pass is { name, enabled?, banner?, run(eventTrees, context) }:
 * - name: used for the per-pass debug state check ("after <name>")
 * - enabled: optional () => boolean, defaults to always-on
 * - banner: optional log line printed before the pass runs (passes with
 *   conditional or dynamic output log inside run() instead)
 * - run: receives all event trees plus a shared context { idToName, stats }
 */
const PIPELINE = [
  {
    name: 'sortEvents',
    banner: '🔤 Sorting events alphabetically...',
    run: (eventTrees) => {
      eventTrees.sort((a, b) => a.name.localeCompare(b.name))
    },
  },
  {
    name: 'filterDefaultNodes',
    enabled: () => OPTIMIZATION_PASS_CONFIG.FILTER_DEFAULT_NODES_ENABLED,
    banner: '🗑️  Filtering default nodes for blacklisted events...',
    run: (eventTrees) => {
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
    },
  },
  {
    name: 'separateChoicesFromEffects',
    enabled: () => OPTIMIZATION_PASS_CONFIG.SEPARATE_CHOICES_FROM_EFFECTS_ENABLED,
    banner: '🔀 Separating choices from effects...',
    run: (eventTrees) => {
      let totalSeparated = 0
      eventTrees.forEach((tree) => {
        totalSeparated += separateChoicesFromEffects(tree.rootNode, createNode, generateNodeId)
      })
      console.log(`  Separated ${totalSeparated} choice-effect pairs`)
    },
  },
  {
    // When choice's only child has ADDKEYWORD: random [list], set choiceLabel to "Add «random»"
    name: 'normalizeAddKeywordRandomChoiceLabels',
    banner: '🏷️  Normalizing ADDKEYWORD random choice labels...',
    run: (eventTrees) => {
      let updated = 0
      eventTrees.forEach((tree) => {
        if (tree.rootNode) {
          const stats = normalizeAddKeywordRandomChoiceLabels(tree.rootNode, { updated: 0 })
          updated += stats.updated
        }
      })
      console.log(`  Updated ${updated} choice label(s) to "Add «random»"`)
    },
  },
  {
    // Fixes the timing issue where separateChoicesFromEffects() creates outcome nodes,
    // making the shallowest hub copy available as a standalone node. We promote it to be
    // canonical and rewrite all refs to point to it (instead of the deeper hub that "won"
    // during tree building).
    name: 'promoteShallowDialogueMenuHub',
    enabled: () => OPTIMIZATION_PASS_CONFIG.PROMOTE_SHALLOW_DIALOGUE_MENU_HUB_ENABLED,
    banner: '🧭 Promoting shallow dialogue-menu hubs...',
    run: (eventTrees) => {
      promoteShallowDialogueMenuHub(eventTrees)
    },
  },
  {
    // Auto-detect and optimize dialogue menu hub patterns (independent BFS-based detection).
    // Runs BEFORE deduplication so semantic hub detection gets priority over structural dedup.
    name: 'detectAndOptimizeDialogueMenuHubs',
    enabled: () => OPTIMIZATION_PASS_CONFIG.POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED,
    run: (eventTrees) => {
      detectAndOptimizeDialogueMenuHubs(eventTrees, debugConfig.eventName)
    },
  },
  {
    // Structural deduplication of identical subtrees (runs AFTER hub optimization passes)
    name: 'deduplicateAllTrees',
    enabled: () => OPTIMIZATION_PASS_CONFIG.DEDUPLICATE_SUBTREES_ENABLED,
    run: (eventTrees, context) => {
      context.stats.nodesBeforeDedupe = eventTrees.reduce(
        (sum, tree) => sum + countNodes(tree.rootNode),
        0
      )
      console.log(`\n🔄 Deduplicating subtrees...`)
      const { totalDuplicates, totalNodesRemoved, eventsWithDedupe, passesRun } =
        deduplicateAllTrees(eventTrees)
      console.log(`  Replaced ${totalDuplicates} duplicate subtrees`)
      console.log(`  Reduced node count by ${totalNodesRemoved}`)
      console.log(`  Converged after ${passesRun} pass${passesRun === 1 ? '' : 'es'}`)

      if (eventsWithDedupe.length > 0 && debugConfig.eventName.length > 0) {
        console.log(`\n  Events with deduplication:`)
        eventsWithDedupe.forEach(({ name, duplicates, nodesRemoved }) => {
          console.log(`    - "${name}": ${duplicates} duplicates, ${nodesRemoved} nodes removed`)
        })
      }
    },
  },
  {
    // Ensures non-choice nodes (like dialogue) don't ref choice wrapper nodes,
    // but instead ref the outcome node (created by separateChoicesFromEffects).
    name: 'normalizeRefsPointingToChoiceNodes',
    enabled: () => OPTIMIZATION_PASS_CONFIG.NORMALIZE_REFS_POINTING_TO_CHOICE_NODES_ENABLED,
    banner: '🎯 Normalizing refs to skip choice wrappers...',
    run: (eventTrees) => {
      const { totalRewrites, eventsWithRewrites } = normalizeRefsPointingToChoiceNodes(eventTrees)
      console.log(`  Rewrote ${totalRewrites} refs`)
      if (eventsWithRewrites.length > 0 && debugConfig.eventName.length > 0) {
        console.log(`\n  Events with ref rewrites:`)
        eventsWithRewrites.forEach(({ name, rewrites }) => {
          console.log(`    - "${name}": ${rewrites} refs rewritten`)
        })
      }
    },
  },
  {
    // Fixes refs that point to combat nodes which have been split into combat + postcombat dialogue
    name: 'normalizeRefsPointingToCombatNodes',
    banner: '⚔️  Normalizing refs pointing to split combat nodes...',
    run: (eventTrees) => {
      const { totalRewrites, eventsWithRewrites } = normalizeRefsPointingToCombatNodes(eventTrees)
      console.log(`  Rewrote ${totalRewrites} refs`)
      if (eventsWithRewrites.length > 0 && debugConfig.eventName.length > 0) {
        console.log(`\n  Events with ref rewrites:`)
        eventsWithRewrites.forEach(({ name, rewrites }) => {
          console.log(`    - "${name}": ${rewrites} refs rewritten`)
        })
      }
    },
  },
  {
    name: 'convertSiblingAndCousinRefsToRefChildren',
    enabled: () => OPTIMIZATION_PASS_CONFIG.CONVERT_SIBLING_AND_COUSIN_REFS_TO_REF_CHILDREN_ENABLED,
    banner: '🔗 Converting sibling and SIMPLE cousin refs to refChildren...',
    run: (eventTrees) => {
      const { totalConversions, eventsWithConversions } =
        convertSiblingAndCousinRefsToRefChildren(eventTrees)
      console.log(`  Converted ${totalConversions} sibling refs`)
      if (eventsWithConversions.length > 0 && debugConfig.eventName.length > 0) {
        console.log(`\n  Events with conversions:`)
        eventsWithConversions.forEach(({ name, conversions }) => {
          console.log(`    - "${name}": ${conversions} sibling refs converted`)
        })
      }
    },
  },
  {
    // Delete pure stand-in refChildren nodes (identical copy of the target, only child):
    // the parent's converging line goes directly to the original node instead.
    name: 'hoistPureStandInRefNodes',
    enabled: () => OPTIMIZATION_PASS_CONFIG.HOIST_PURE_STAND_IN_REF_NODES_ENABLED,
    banner: '🪝 Hoisting pure stand-in refChildren nodes...',
    run: (eventTrees) => {
      const { totalHoists, eventsWithHoists } = hoistPureStandInRefNodes(eventTrees)
      console.log(`  Hoisted ${totalHoists} stand-in node(s)`)
      if (eventsWithHoists.length > 0 && debugConfig.eventName.length > 0) {
        console.log(`\n  Events with hoists:`)
        eventsWithHoists.forEach(({ name, hoists }) => {
          console.log(`    - "${name}": ${hoists} stand-in(s) hoisted`)
        })
      }
    },
  },
  {
    // Manual fixes for conditional choices, etc. (data in event-alterations.js)
    name: 'applyEventAlterations',
    enabled: () => OPTIMIZATION_PASS_CONFIG.APPLY_EVENT_ALTERATIONS_ENABLED,
    banner: '🔧 Applying event alterations...',
    run: (eventTrees, context) => {
      let totalApplied = 0
      const warnings = []
      try {
        if (EVENT_ALTERATIONS && Array.isArray(EVENT_ALTERATIONS)) {
          eventTrees.forEach((tree) => {
            const eventAlterations = EVENT_ALTERATIONS.find((a) => a.name === tree.name)
            if (eventAlterations) {
              const perEventWarnings = []
              const appliedCount = applyEventAlterations(
                tree.rootNode,
                eventAlterations.alterations,
                generateNodeId,
                perEventWarnings
              )
              totalApplied += appliedCount
              perEventWarnings.forEach((warning) => warnings.push(`"${tree.name}": ${warning}`))
              if (appliedCount > 0 && tree.name === debugConfig.eventName) {
                console.log(`  - "${tree.name}": applied ${appliedCount} alteration(s)`)
              }
            }
          })
        } else {
          console.log(`  No event alterations module found`)
        }
      } catch (error) {
        warnings.push(`Error applying event alterations: ${error.message}`)
        console.warn(`  ⚠️  Error applying event alterations: ${error.message}`)
      }
      console.log(`  Applied ${totalApplied} alteration(s)`)
      context.stats.alterationsApplied = totalApplied
      context.stats.alterationWarnings = warnings
    },
  },
  {
    name: 'checkInvalidRefs',
    enabled: () => OPTIMIZATION_PASS_CONFIG.CHECK_INVALID_REFS_ENABLED,
    run: (eventTrees) => {
      checkInvalidRefs(eventTrees)
    },
  },
  {
    name: 'cleanUpRandomValues',
    enabled: () => OPTIMIZATION_PASS_CONFIG.CLEAN_UP_RANDOM_VALUES_ENABLED,
    run: (eventTrees) => {
      const updated = cleanUpRandomValues(eventTrees)
      if (updated > 0) {
        console.log(`\n🎲 Cleaned up random gold/damage in text: ${updated} node(s)`)
      }
    },
  },
  {
    // Fixes events that use dynamic card refs (e.g. [cardid=VAR] at runtime, AREAEFFECT: id)
    name: 'replaceCardIds',
    banner: '🃏 Replacing card/talent IDs with names...',
    run: (eventTrees, context) => {
      const replaceStats = { replaced: 0 }
      eventTrees.forEach((tree) => {
        if (tree.rootNode) replaceCardIdsInNode(tree.rootNode, context.idToName, replaceStats)
      })
      console.log(`  Replaced ${replaceStats.replaced} card/talent ID reference(s)`)
    },
  },
]

/**
 * Main processing function
 */
async function processEvents() {
  const startTime = Date.now()

  console.log('📖 Reading events file...')
  const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))

  // Fail fast if any per-event config entry doesn't resolve to a real, parseable event
  // (config entries are keyed by display name, so compute those first)
  const parseableEventNames = new Set(
    events
      .filter((event) => event.text)
      .map((event) => determineNameAndAlias(event.name, event.caption).displayName)
  )
  validateEventConfigs(parseableEventNames)

  console.log(`\n🔍 Processing ${events.length} events...\n`)

  const eventTrees = []
  let successCount = 0
  let errorCount = 0
  let emptyCount = 0

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const { name, type, artwork, text, caption, deprecated } = event

    const { displayName, alias } = determineNameAndAlias(name, caption)
    const blightbaneLink = `https://www.blightbane.io/event/${name.replaceAll(' ', '_')}`

    // --only mode: skip everything except the requested event (match display name or raw name)
    if (CLI_ARGS.only && displayName !== CLI_ARGS.only && name !== CLI_ARGS.only) {
      continue
    }

    if (!text) {
      if (displayName === debugConfig.eventName) {
        console.log(`  ⊘  [${i + 1}/${events.length}] Skipping "${displayName}" (no text content)`)
      }
      emptyCount++
      continue
    }

    if (displayName === debugConfig.eventName) {
      console.log(`  → [${i + 1}/${events.length}] Parsing "${displayName}" (type ${type})...`)
    }

    const rootNode = parseInkStory(text, displayName)

    if (rootNode) {
      const eventTree = {
        name: displayName,
        type,
        artwork: artwork || '',
        rootNode,
        blightbaneLink,
      }

      // Add alias field if it exists
      if (alias) {
        eventTree.alias = alias
      }

      // Add deprecated field if present
      if (deprecated) {
        eventTree.deprecated = deprecated
      }

      eventTrees.push(eventTree)
      successCount++
      if (displayName === debugConfig.eventName) {
        console.log(`    ✓ Success (${countNodes(rootNode)} nodes)`)
      }
    } else {
      errorCount++
    }
  }

  if (CLI_ARGS.only && eventTrees.length === 0) {
    console.error(`❌ --only "${CLI_ARGS.only}" did not match any parseable event`)
    process.exit(1)
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

  // Card/talent id->name mapping (used by the replaceCardIds pass): read from the
  // cache written by extract-events.js, falling back to a live API fetch
  console.log('\n🃏 Loading card/talent data for ID replacement...')
  const idToName = await readOrFetchIdToNameMapping()

  // Run the post-processing pipeline
  const context = { idToName, stats: {} }
  for (const pass of PIPELINE) {
    const enabled = pass.enabled ? pass.enabled() : true
    if (!enabled) continue
    if (pass.banner) {
      console.log(`\n${pass.banner}`)
    }
    pass.run(eventTrees, context)
    debugCheckEventPipelineState(eventTrees, `after ${pass.name}`)
  }

  // Calculate final stats
  const finalTotalNodes = eventTrees.reduce((sum, tree) => sum + countNodes(tree.rootNode), 0)
  console.log(
    `\n  Final node count: ${finalTotalNodes} (was ${context.stats.nodesBeforeDedupe ?? finalTotalNodes})`
  )

  // End-of-run summary of the per-event special-casing, so a degraded run (alterations
  // whose "find" no longer matches anything) is visible without scrolling back
  const alterationWarnings = context.stats.alterationWarnings || []
  console.log(
    `\n🔧 Event alterations: ${context.stats.alterationsApplied ?? 0} applied, ${alterationWarnings.length} warning(s)`
  )
  if (alterationWarnings.length > 0) {
    alterationWarnings.forEach((warning) => console.log(`  ⚠️  ${warning}`))
  }

  // Summary of non-fatal parse failures recorded during tree building (spec 11):
  // a healthy run prints nothing here
  printParseFailureSummary()

  // --only mode: merge the re-parsed event(s) into the existing output instead of replacing it
  let outputTrees = eventTrees
  if (CLI_ARGS.only) {
    outputTrees = mergeTreesIntoExistingOutput(eventTrees)
  }

  // Write output (to a temp file in --dry-run mode, so validation can still diff it)
  const writtenFilePath = CLI_ARGS.dryRun
    ? path.join(os.tmpdir(), `event-trees-dry-run-${process.pid}.json`)
    : OUTPUT_FILE
  if (CLI_ARGS.dryRun) {
    console.log(`\n🧪 Dry run: writing to temp file instead of ${OUTPUT_FILE}`)
  }
  console.log(`\n💾 Re-writing to ${writtenFilePath}...`)
  fs.writeFileSync(writtenFilePath, JSON.stringify(outputTrees, null, 2), 'utf-8')

  console.log('\n✨ Done!')

  // Show elapsed time
  const endTime = Date.now()
  const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2)
  console.log(`⏱️  Total parsing time: ${elapsedSeconds}s`)

  return { writtenFilePath }
}

/**
 * Merge freshly parsed trees into the existing output file (used by --only).
 * Replaces entries with the same name, appends new ones, and keeps the
 * alphabetical-by-name ordering the full pipeline produces.
 */
function mergeTreesIntoExistingOutput(eventTrees) {
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.warn(`  ⚠️  ${OUTPUT_FILE} does not exist yet - writing only the parsed event(s)`)
    return eventTrees
  }

  const existingTrees = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))
  const parsedByName = new Map(eventTrees.map((tree) => [tree.name, tree]))

  const merged = existingTrees.map((tree) => parsedByName.get(tree.name) || tree)
  const existingNames = new Set(existingTrees.map((tree) => tree.name))
  eventTrees.forEach((tree) => {
    if (!existingNames.has(tree.name)) merged.push(tree)
  })
  merged.sort((a, b) => a.name.localeCompare(b.name))

  const replacedCount = eventTrees.length - merged.filter((t) => !existingNames.has(t.name)).length
  console.log(
    `\n🔀 Merging into existing output: ${replacedCount} replaced, ${eventTrees.length - replacedCount} added (${merged.length} total)`
  )
  return merged
}

// Run the script
;(async () => {
  try {
    const { writtenFilePath } = await processEvents()
    validateEventTreesChanges({
      currentPath: writtenFilePath,
      baselinePath: CLI_ARGS.baseline,
    })
  } catch (error) {
    console.error('❌ Fatal error:', error)
    console.error(error.stack)
    process.exit(1)
  }
})()
