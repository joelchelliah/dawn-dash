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
  'Broken Vault': {
    menuHubPattern: 'Three wardens loom over the cell',
    menuExitPatterns: ['Look at the position of the statues', 'Step back'],
  },
  // The Nexus's companion menu is only reachable because of the `picks` override in
  // INK_VARIABLE_OVERRIDES below — without it none of these choices exist at all.
  //
  // Each companion can be visited in any order, and every companion's "Leave: No thank
  // you." returns to the hub with the visited one removed, so naive exploration walks all
  // 7! orderings. Immediate-ref mode (no hubChoiceMatchThreshold), like Rathael and Broken
  // Vault: the return to the hub carries no text of its own, so nothing is lost by reffing.
  //
  // Every companion is an exit pattern, which reads backwards but is required: in
  // immediate-ref mode a NON-exit child is turned into a ref *before* its subtree is
  // built, and each "Turn to <companion>" choice owns real content (their dialogue, reply
  // options and service sub-menu). Listing them keeps that content.
  //
  // menuExitPatterns alone would still explode, because the return to the menu emits no
  // text and has no stable Ink path — menuHubPattern can't re-detect it. menuReturnDetection
  // recognises the return by its choice set instead (see tree-building.js).
  'The Nexus': {
    menuHubPattern: 'A dream drifts up past your face',
    menuExitPatterns: [
      'Turn to Viola',
      'Turn to Theresa',
      'Turn to Serena',
      'Turn to the Count',
      'Turn to Bolgar',
      'Turn to Nathali',
      'Turn to Julius',
      'Leave: We have lingered here long enough.',
    ],
    menuReturnDetection: true,
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

// Ink global variables forced to a fixed value before story exploration starts
// (applied by tree-building.js right after the Story is constructed, so the value is in
// place before the first Continue()).
//
// WHY THIS EXISTS:
// Some variables are set by the *game engine*, not by the Ink story, and gate which
// choices the runtime offers. inkjs can't know their value, so it evaluates the gate
// against the `global decl` default and silently hides every branch behind it.
//
// The Nexus is the only such case: its root runs `STORYFUNCTION:setpicks:nexuscompanions`,
// where `nexuscompanions` is an engine-resolved token expanding to the companions the
// player actually recruited. `setpicks` is an Ink function, but it is only ever *called*
// through that external command — inkjs never executes it — so `picks` keeps its
// `global decl` default of "". All 7 "Turn to <companion>" choices test it with Ink's
// substring operator (`picks ? "priest"` etc.), so an empty value hides all of them plus
// the ~15 containers behind them.
//
// Setting `picks` to a string containing all 7 tokens opens every gate, which is the right
// output for a static map that shows every path together with its requirement — each
// choice label is already prefixed `questflag:priest;…`, so the existing requirement
// parsing annotates them automatically.
//
// Kept as a concrete per-event override rather than a general variable-gating framework:
// `setpicks` occurs exactly once in the dataset (the other STORYFUNCTION calls are
// `changeCost`, which gate nothing).
const INK_VARIABLE_OVERRIDES = {
  'The Nexus': {
    // Substring-tested by the 7 companion choices in the `lookaround` container.
    // Separator is arbitrary — `?` is a plain substring test, not a list operation.
    picks: 'priest alchemist succubus illusionist enchanter nathali merchant',
  },
}

// Ink cost variables the GAME ENGINE reassigns at runtime, so the number inkjs renders is
// only the story's `global decl` starting value and can be wrong in play.
//
// The engine calls `STORYFUNCTION:changeCost:<engineValue>`, and `changeCost` is an Ink
// function that assigns its parameter to a global. inkjs never executes that call (it's an
// external command), so the parameter read resolves to nothing — the parser emits the
// `<newCost>` placeholder — and the global keeps its declared default.
//
// The catch is that the default is then interpolated into everything the player sees. For
// `enchantmentCost` a single variable feeds FOUR sites, so a stale value is wrong in four
// places at once:
//   1. the choice label     "100 Gold: Imbue an Enchantment"
//   2. the gold requirement "gold:100"
//   3. the deduction effect "GOLD: -100"
//   4. the assignment       "SET enchantmentCost = <newCost>"
//
// `escalation` describes how the value actually moves in game (confirmed with the
// developers): imbuing starts at 100 gold and each use raises it by 50. Rendering the
// series is more truthful than a lone "100", which reads as a fixed price.
//
// Scoped to the named variable on purpose: both events read several other cost variables
// (memorizeCost, healCost, cleanseCost, ...) that nothing reassigns, and those keep their
// real numbers.
const ENGINE_ADJUSTED_COST_VARIABLES = {
  'The Nexus': {
    // labelPattern identifies the priced service, so the rewrite can't spill onto other
    // services that happen to also cost 100 (e.g. the Count's "100 Gold: Copy a card.",
    // which is a genuinely fixed price from a different, never-reassigned variable).
    enchantmentCost: { start: 100, step: 50, labelPattern: 'Imbue an Enchantment' },
  },
  Enchanter: {
    // labelPattern identifies the priced service, so the rewrite can't spill onto other
    // services that happen to also cost 100 (e.g. the Count's "100 Gold: Copy a card.",
    // which is a genuinely fixed price from a different, never-reassigned variable).
    enchantmentCost: { start: 100, step: 50, labelPattern: 'Imbue an Enchantment' },
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
const DEPRECATED_EVENTS = ['Mirror Shard', 'Robed Figure', 'Iron Gates', 'Strange Light']

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
  INK_VARIABLE_OVERRIDES,
  ENGINE_ADJUSTED_COST_VARIABLES,
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
