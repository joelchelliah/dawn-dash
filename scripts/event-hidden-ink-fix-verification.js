#!/usr/bin/env node

/**
 * Event Hidden Ink Fix Verification
 *
 * This script checks which hidden Ink mechanics from potentially-hidden-ink-mechanics.md
 * have been fixed in the event-trees.json output.
 *
 * It performs pattern matching to detect if specific knots/mechanics are present in the tree.
 *
 * Usage:
 *   node scripts/event-hidden-ink-fix-verification.js           # Default output
 *   node scripts/event-hidden-ink-fix-verification.js --verbose  # Show all terms
 *   node scripts/event-hidden-ink-fix-verification.js --missing  # Only unfixed events
 *   node scripts/event-hidden-ink-fix-verification.js --help     # Show help
 *
 * The script searches for:
 * - Knot names in text/choiceLabel/requirements
 * - Pattern keywords (e.g., "puzzle", "success", "failure")
 * - Special node types (e.g., type: "special")
 *
 * Status indicators:
 * ✅ Fully fixed - All expected mechanics found
 * 🟡 Partially fixed - Some mechanics found
 * ❌ Not fixed - No mechanics found
 * ⚪ Global decl only - No specific mechanics to verify
 */

const fs = require('fs')
const path = require('path')

const TREES_FILE = path.join(__dirname, '../src/codex/data/event-trees.json')
const EVENTS_FILE = path.join(__dirname, 'data/events.json')

// Map of event names from analysis to their expected mechanics
// Format: { eventName: { caption: 'Tree Name', knots: ['knot1', 'knot2'], patterns: ['pattern1'] } }
const EXPECTED_MECHANICS = {
  Collector: {
    caption: 'Collector',
    knots: [
      'Drakkan',
      'Asteran',
      'GoldenIdol',
      'Legendary',
      'Corruption',
      'Common',
      'Uncommon',
      'Monster',
      'Rare',
      'Epic',
    ],
  },
  'Enchanter 1': {
    caption: 'Enchanter',
    knots: ['changeCost'],
  },
  Illusionist: {
    caption: 'Illusionist',
    knots: [],
  },
  Priest: {
    caption: 'The Priestess',
    knots: [],
  },
  'Priest 1': {
    caption: 'Priest',
    knots: [],
  },
  'Succubus 1': {
    caption: 'Succubus',
    knots: [],
  },
  'The Ferryman': {
    caption: 'The Ferryman',
    knots: [
      'FerrymanApproach',
      'FerrymanIdentity',
      'PlaceDescription',
      'OtherSideExplanation',
      'CoinsExplanation',
      'TollExplanation',
      'CoinsNeeded',
      'playerOffersCoins',
      'AskForPassage',
      'SuccessfulCrossing',
      'FerrymanBoatRide',
      'DescendIntoDarkness',
    ],
  },
  ACallForHelp: {
    caption: 'A Call for Help',
    knots: [],
  },
  Amnesiac: {
    caption: 'Small Fortune',
    knots: [],
  },
  BrightGem: {
    caption: 'Bright Gem',
    knots: [],
  },
  'Heated Debate': {
    caption: 'Heated Debate',
    knots: [],
  },
  'Hollow Tree': {
    caption: 'Hollow Treetrunk',
    knots: [],
  },
  Prayer: {
    caption: 'Lady of Mercy',
    knots: [],
  },
  TheCardGame: {
    caption: 'The Cardgame',
    knots: ['random'],
  },
  'Ancient Tree': {
    caption: 'Ancient Tree',
    knots: ['hint_of_danger'],
    patterns: ['hint', 'danger'],
  },
  'Earthy Crater': {
    caption: 'Earthy Crater',
    knots: [
      'approach_crater',
      'inspect_ground',
      'look_around',
      'consider_descending',
      'descend_illuminated_side',
      'descend_shadowy_side',
    ],
    patterns: ['approach', 'crater', 'inspect', 'ground', 'descend', 'illuminated', 'shadowy'],
  },
  'Fancy Grave': {
    caption: 'Fancy Tombstone',
    knots: [],
  },
  'Frozen Heart': {
    caption: 'Frozen Heart',
    knots: ['open_chest', 'left', 'right', 'exit', 'meeting'],
    patterns: ['PUZZLE SUCCESS', 'PUZZLE FAILURE', 'special'],
  },
  'Shard of Mirrors': {
    caption: 'Historic Shard',
    knots: [
      'KNOT_PICK_STORIES',
      'KNOT_BRANCH_WAITING',
      'KNOT_END_STORY',
      'func_offer_answer',
      'func_note_answer',
      'func_came_from',
    ],
    patterns: ['stories', 'waiting', 'answer'],
  },
  'Talking Tree': {
    caption: 'Talking Tree',
    knots: [],
  },
  'The Suntree': {
    caption: 'The Suntree',
    knots: [
      'approach_mage',
      'ask_tree',
      'introduce_self',
      'bolgar_conversation',
      'prepare_for_threat',
      'ask_bolgar',
      'hydra_appears',
    ],
    patterns: ['approach', 'mage', 'tree', 'Bolgar', 'hydra'],
  },
  'Brightcandle Inn': {
    caption: 'Brightcandle Inn',
    knots: [],
  },
  'Dawnbringer Ystel': {
    caption: 'Dawnbringer Ystel',
    knots: [
      'YstelStatueApproach',
      'Destroy',
      'ExamineStatue',
      'InscriptionSearch',
      'TouchSword',
      'ReflectOnLegacy',
      'MutterPrayer',
    ],
    patterns: ['statue', 'Ystel', 'sword', 'legacy', 'prayer'],
  },
  'Forking Tunnel': {
    caption: 'Forking Tunnel',
    knots: [],
  },
  'Lightmarshal Lucius': {
    caption: 'Lightmarshal Lucius',
    knots: [
      'LuciousStatueApproach',
      'Destroy',
      'ExamineStatue',
      'InscriptionSearch',
      'TouchStatue',
      'UtterPrayer',
      'ReceiveWard',
    ],
    patterns: ['Lucius', 'statue', 'prayer', 'ward'],
  },
  'Mystical Glade': {
    caption: 'Mystical Glade',
    knots: ['enter_glade'],
    patterns: ['enter', 'glade'],
  },
  'Overgrown Stone': {
    caption: 'Overgrown Stone',
    knots: [
      'approach_stone',
      'examine_stone',
      'look_around_clearing',
      'ponder_battle',
      'reflect_battle',
      'search_clues',
      'aftermath',
      'take_fragment',
      'leave_clearing',
    ],
    patterns: ['stone', 'clearing', 'battle', 'fragment'],
  },
  Rae: {
    caption: 'Sungod Rae',
    knots: [
      'RaeStatueApproach',
      'Destroy',
      'ExamineStatue',
      'InscriptionSearch',
      'TouchStatue',
      'ReflectOnRae',
    ],
    patterns: ['Rae', 'statue'],
  },
  'Shrine of Trickery': {
    caption: 'Shrine of Trickery',
    knots: ['random'],
  },
  'Abandoned Backpack': {
    caption: 'Abandoned Backpack',
    knots: [
      'examine_backpack',
      'observe',
      'journal',
      'locket',
      'belongings',
      'options',
      'listen',
      'communicate',
      'take_leave',
      'discard',
      'leave_early',
    ],
    patterns: ['backpack', 'journal', 'locket', 'belongings', 'communicate'],
  },
  'Damsel in Distress': {
    caption: 'Damsel in Distress',
    knots: ['suspect', 'holy_warning', 'help_woman', 'enthralled', 'confrontation'],
    patterns: ['suspect', 'warning', 'enthralled', 'confrontation'],
  },
  'The Deal': {
    caption: 'The Deal',
    knots: [
      'explanation',
      'grab',
      'release_imp',
      'take_bottle',
      'banish',
      'memory_deal',
      'change',
      'redpotion',
      'greenpotion',
      'bluepotion',
      'endpotion',
      'refuse',
      'leave',
    ],
    patterns: ['imp', 'bottle', 'potion', 'banish', 'memory'],
  },
  'The Dream': {
    caption: 'The Dream',
    knots: ['stars', 'depths', 'call', 'awaken', 'awakening'],
    patterns: ['stars', 'depths', 'awaken'],
  },
  'The Fracture': {
    caption: 'The Fracture',
    knots: ['study_symbols', 'touch_tear', 'smash_orb', 'extract_orb', 'leave'],
    patterns: ['symbols', 'tear', 'orb', 'fracture'],
  },
}

/**
 * Search for text patterns in a node tree
 */
function searchNodeTree(node, searchTerms, foundTerms = new Set()) {
  if (!node) return foundTerms

  // Check text content
  if (node.text) {
    const lowerText = node.text.toLowerCase()
    searchTerms.forEach((term) => {
      if (lowerText.includes(term.toLowerCase())) {
        foundTerms.add(term)
      }
    })
  }

  // Check choiceLabel
  if (node.choiceLabel) {
    const lowerLabel = node.choiceLabel.toLowerCase()
    searchTerms.forEach((term) => {
      if (lowerLabel.includes(term.toLowerCase())) {
        foundTerms.add(term)
      }
    })
  }

  // Check requirements (for special patterns like "PUZZLE SUCCESS")
  if (node.requirements) {
    node.requirements.forEach((req) => {
      const lowerReq = req.toLowerCase()
      searchTerms.forEach((term) => {
        if (lowerReq.includes(term.toLowerCase())) {
          foundTerms.add(term)
        }
      })
    })
  }

  // Check node type (for "special" type)
  if (node.type) {
    searchTerms.forEach((term) => {
      if (node.type === term) {
        foundTerms.add(term)
      }
    })
  }

  // Recurse through children
  if (node.children) {
    node.children.forEach((child) => searchNodeTree(child, searchTerms, foundTerms))
  }

  return foundTerms
}

/**
 * Verify fixes for a single event
 */
function verifyEvent(tree, expected) {
  const results = {
    found: [],
    missing: [],
    totalExpected: 0,
  }

  // Combine knots and patterns
  const allExpectedTerms = [...(expected.knots || []), ...(expected.patterns || [])]

  results.totalExpected = allExpectedTerms.length

  if (allExpectedTerms.length === 0) {
    // No specific mechanics to check (likely just "global decl")
    return { found: [], missing: [], totalExpected: 0, isGlobalDeclOnly: true }
  }

  const foundTerms = searchNodeTree(tree.rootNode, allExpectedTerms)

  allExpectedTerms.forEach((term) => {
    if (foundTerms.has(term)) {
      results.found.push(term)
    } else {
      results.missing.push(term)
    }
  })

  return results
}

/**
 * Main verification function
 */
function main() {
  // Check for verbose flag
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v')
  const showOnlyMissing = process.argv.includes('--missing') || process.argv.includes('-m')

  console.log('🔍 Event Hidden Ink Mechanics Verification\n')

  if (verbose) {
    console.log('Running in VERBOSE mode - showing all missing terms\n')
  }
  if (showOnlyMissing) {
    console.log('Showing only events with MISSING mechanics\n')
  }

  // Load event trees
  const treesData = JSON.parse(fs.readFileSync(TREES_FILE, 'utf-8'))
  const eventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))

  // Build a map from caption to event name
  const captionToName = new Map()
  eventsData.forEach((event) => {
    if (event.caption) {
      captionToName.set(event.caption, event.name)
    }
  })

  // Statistics
  let totalEvents = 0
  let fullyFixed = 0
  let partiallyFixed = 0
  let notFixed = 0
  let globalDeclOnly = 0

  // Check each expected event
  Object.entries(EXPECTED_MECHANICS).forEach(([eventName, expected]) => {
    const tree = treesData.find((t) => t.name === expected.caption)

    if (!tree) {
      console.log(`❌ Event not found in trees: ${eventName} (${expected.caption})`)
      return
    }

    totalEvents++
    const results = verifyEvent(tree, expected)

    if (results.isGlobalDeclOnly) {
      globalDeclOnly++
      if (!showOnlyMissing) {
        console.log(`⚪ ${expected.caption}`)
        console.log(`   (No specific mechanics to verify - likely only "global decl")`)
        console.log('')
      }
      return
    }

    // Determine status
    let status
    if (results.found.length === results.totalExpected) {
      status = '✅'
      fullyFixed++
    } else if (results.found.length > 0) {
      status = '🟡'
      partiallyFixed++
    } else {
      status = '❌'
      notFixed++
    }

    // Skip if showing only missing and this event is fully fixed
    if (showOnlyMissing && results.found.length === results.totalExpected) {
      return
    }

    console.log(`${status} ${expected.caption}`)

    if (results.found.length > 0 && !showOnlyMissing) {
      if (verbose) {
        console.log(`   ✅ Found: ${results.found.join(', ')}`)
      } else {
        const foundDisplay = results.found.slice(0, 5).join(', ')
        const moreFound = results.found.length > 5 ? ` (+${results.found.length - 5} more)` : ''
        console.log(`   ✅ Found: ${foundDisplay}${moreFound}`)
      }
    }

    if (results.missing.length > 0) {
      if (verbose) {
        console.log(`   ❌ Missing: ${results.missing.join(', ')}`)
      } else {
        const missingDisplay = results.missing.slice(0, 5).join(', ')
        const moreMissing =
          results.missing.length > 5 ? ` (+${results.missing.length - 5} more)` : ''
        console.log(`   ❌ Missing: ${missingDisplay}${moreMissing}`)
      }
    }

    console.log(`   Progress: ${results.found.length}/${results.totalExpected}`)
    console.log('')
  })

  // Summary
  console.log('━'.repeat(60))
  console.log('📊 Summary')
  console.log('━'.repeat(60))
  console.log(`Total events checked: ${totalEvents}`)
  console.log(`✅ Fully fixed: ${fullyFixed}`)
  console.log(`🟡 Partially fixed: ${partiallyFixed}`)
  console.log(`❌ Not fixed: ${notFixed}`)
  console.log(`⚪ Global decl only: ${globalDeclOnly}`)
  console.log('')

  const fixedPercentage =
    totalEvents > 0 ? ((fullyFixed / (totalEvents - globalDeclOnly)) * 100).toFixed(1) : 0
  console.log(`Overall progress: ${fixedPercentage}% of events with specific mechanics`)

  // Usage instructions
  if (!verbose && !showOnlyMissing) {
    console.log('')
    console.log('💡 Tip: Use --verbose or -v to see all missing terms')
    console.log('💡 Tip: Use --missing or -m to show only events with missing mechanics')
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Event Hidden Ink Fix Verification')
  console.log('')
  console.log('Usage: node event-hidden-ink-fix-verification.js [options]')
  console.log('')
  console.log('Options:')
  console.log('  --verbose, -v    Show all missing terms (not truncated)')
  console.log('  --missing, -m    Show only events with missing mechanics')
  console.log('  --help, -h       Show this help message')
  console.log('')
  process.exit(0)
}

try {
  main()
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
