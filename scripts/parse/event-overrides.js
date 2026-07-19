/**
 * ALL per-event special-casing in the event pipeline, in one discoverable place.
 *
 * Every rule here is keyed by exact event (display) name. To answer "what special
 * handling does event X get?", search this file — plus event-alterations.js for manual
 * tree fixes (kept as its own file because of its size; re-exported here).
 *
 * Startup validation (config-validation.js) checks that every name used here resolves
 * to a real, parseable event, so a typo or an upstream rename fails the run loudly.
 *
 * The pass toggles and non-per-event tuning knobs live in configs.js, which spreads
 * the relevant structures below into OPTIMIZATION_PASS_CONFIG for its consumers.
 */

// Special-case events with dialogue menu patterns (ask questions in any order)
// For these events, we detect when we're at a dialogue menu hub node (menuHubPattern)
// and create refs from all children back to the hub, except for nodes matching menuExitPatterns.
//
// WHY WE NEED THIS:
// Without this early detection, Rathael's factorial explosion (9! = 362,880 orderings)
// would cause us to hit node budget limits during tree generation and create an
// incomplete tree. This early ref creation keeps the tree small enough to finish building.
//
// hubChoiceMatchThreshold (optional):
// - When OMITTED: Immediate ref creation mode
//   * Children that don't match menuExitPatterns are converted to refs IMMEDIATELY,
//     before building their subtrees. This prevents deep building and avoids hitting
//     node limits, but requires that all meaningful content appears at the hub level.
//   * Example: Rathael - all dialogue choices lead directly back to the hub, so
//     immediate refs work perfectly.
//
// - When PROVIDED: Delayed hub detection mode
//   * Children are built normally (full subtrees) to preserve intermediate content
//     (e.g., room descriptions in Rotting Residence). After building, we check if a
//     node's children match >= hubChoiceMatchThreshold% of the hub's original choices.
//     If matched, that node becomes a ref back to the hub.
//   * This allows preserving meaningful content (like room descriptions) that appears
//     between the hub choice and the return to hub, while still collapsing the loop.
//   * Example: Rotting Residence - choosing "Go to the Kitchen" shows a room description
//     before returning to the hub, so we need to build that path fully first.
//   * Note: This mode builds deeper trees, so may require higher node budgets.
const DIALOGUE_MENU_EVENTS = {
  'Frozen Heart': {
    menuHubPattern: 'A rhythmic pulse fills the cave',
    menuExitPatterns: ['Take the left tunnel', 'Take the right tunnel'],
    // NOTE: Should actually be 0 (0/3 choices). But unfortunately that breaks the detection logic...
    hubChoiceMatchThreshold: 30, // choices: 1/3
    passWhenOnlyExitPatternsAvailable: true,
  },
  'Rathael the Slain Death': {
    menuHubPattern: 'A chance to tangle with one of these',
    menuExitPatterns: ['Fight: Confront the Seraph'],
    // This is not really necessary for Rathael, but just including it for completeness
    // Slows down the tree building process a lot though...
    // hubChoiceMatchThreshold: 85, // choices: 7/8
  },
  'Suspended Cage': {
    menuHubPattern: 'Quickly pry open the lock',
    menuExitPatterns: ['Leave'],
    hubChoiceMatchThreshold: 60, // choices: 2/3
  },
}

// Path convergence early dedup (see OPTIMIZATION_PASS_CONFIG.PATH_CONVERGENCE):
// - If we reach the same node state (text + choices) via different routes, create a ref.
// - Only enabled for events that need it to parse successfully.
// - skipPatterns: text patterns to exclude from path convergence (let post-processing handle them)
const PATH_CONVERGENCE = {
  'Frozen Heart': {
    skipPatterns: [
      'You make your way up to the peak, only to reveal a final challenge',
      'A large chasm greets you on the other side',
      'A masterful illusion',
      'The simple chamber presents two obvious choices',
    ],
  },
}

// For the events in this list, we should not include nodes that have the
// choiceLabel === 'default' OR text === 'default'
// Skip those nodes along with their entire subtree.
const DEFAULT_NODE_BLACKLIST = ['A Familiar Face']

// All events get post-processing hub-pattern optimization EXCEPT those in this
// blacklist (known false positives)
const POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST = [
  'Frozen Heart', // FALSE POSITIVE: "You mean the amulet?" - huntress/NOT huntress choices have same direct children texts
  'Mysterious Crates', // FALSE POSITIVE: 2 choices match hub pattern but are completely different subtrees
  'Suspended Cage', // FALSE POSITIVE: Truth -> Imperfection -> Darkness false match
  'The Deal', // FALSE POSITIVE: 2 potions are taken after another, but this creates a false match on the second potion
]

// Some complex trees get weird horizontal spacing issues when the
// sibling/cousin-ref-to-refChildren pass reorders parents
const COUSIN_REF_BLACKLIST = []
const COMPLEX_COUSIN_REF_BLACKLIST = []

// Known non-deterministic content, ignored by output validation (parse-validation.js).
// These events roll random content DURING story exploration, so their text/choiceLabel
// values can differ between two runs of the parser with identical code and input.
// Keyed by event name; values are text/choiceLabel prefixes to mask during comparison.
const VALIDATION_IGNORE_RULES = {
  // The skeleton sits against a "nearby wall" vs "nearby signpost"
  'Fallen Soldier': ['A skeleton in highly oxidised'],
  // The "Focus on the ..." choice labels shuffle between runs
  'Mirror Shard': [
    'Focus on the Blacksmith',
    'Focus on the Forger',
    'Focus on the Succubus',
    'Focus on the Alchemist',
    'Focus on the Collector',
    'Focus on the Consul',
    'Focus on the Necromancer',
    'Focus on the Priestess',
  ],
}

// Manual display-name aliases, used by determineNameAndAlias when an event's name is
// human-readable but its caption is not (keyed by the name, which becomes the display name)
const EVENT_NAME_ALIASES = {
  'Heart of the Temple': 'Heart of Fire',
}

// Events marked deprecated during extraction (extract-events.js), keyed by caption.
// They are still parsed and rendered, but flagged in the output data.
const DEPRECATED_EVENTS = ['Mirror Shard', 'Robed Figure', 'Iron Gates']

// ADDKEYWORD command values that are not literal keyword names and can't be resolved
// via the event's Ink function definitions (see Shrine of Trickery). Maps the raw
// command value to the effect list it should produce.
const SPECIAL_KEYWORD_EFFECT_VALUES = {
  'a keyword': ['ADDKEYWORD: random'],
  chaos: ['ADDKEYWORD: random', 'ADDKEYWORD: random', 'ADDTYPE: Corruption', 'SWAPCOST: blood'],
}

// Manual per-event tree fixes (large data file, kept separate; applied by
// apply-event-alterations.js as the applyEventAlterations pipeline pass)
const EVENT_ALTERATIONS = require('./event-alterations.js')

module.exports = {
  DIALOGUE_MENU_EVENTS,
  PATH_CONVERGENCE,
  DEFAULT_NODE_BLACKLIST,
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST,
  COUSIN_REF_BLACKLIST,
  COMPLEX_COUSIN_REF_BLACKLIST,
  VALIDATION_IGNORE_RULES,
  EVENT_NAME_ALIASES,
  DEPRECATED_EVENTS,
  SPECIAL_KEYWORD_EFFECT_VALUES,
  EVENT_ALTERATIONS,
}
