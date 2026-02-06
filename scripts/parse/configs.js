/* eslint-disable */

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
  'Mysterious Crates': {
    menuHubPattern: 'You open the crates with a hefty blow of your weapon.',
    menuExitPatterns: ['Open the other crates', 'Leave'],
    hubChoiceMatchThreshold: 60, // choices: 2/3
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
  'The Boneyard': {
    menuHubPattern: '"A parasite, one of the worst',
    menuExitPatterns: ['Continue'],
    hubChoiceMatchThreshold: 60, // choices: 2/3
  },
  'The Defiled Sanctum': {
    menuHubPattern: '"First." one of the heads answers.',
    menuExitPatterns: ['Tell me something else.'],
    hubChoiceMatchThreshold: 60, // choices: 2/3
  },
  'The Ferryman': {
    menuHubPattern: '"I am but a guide for the souls',
    menuExitPatterns: ['Back to other questions.'],
    hubChoiceMatchThreshold: 60, // choices: 2/3
  },
  'The Priestess': {
    menuHubPattern: 'In this mystical place',
    menuExitPatterns: ['We have to keep moving.'],
    hubChoiceMatchThreshold: 60, // choices: 2/3
  },
  'Warfront Survivor': {
    menuHubPattern: 'Amidst the carnage you notice',
    menuExitPatterns: ['Attack the Demon'],
    hubChoiceMatchThreshold: 50, // choices: 1/2
  },
  'Weeping Woods Start': {
    menuHubPattern: '"A wise decision. The dark lands',
    menuExitPatterns: ['That is all I needed to know'],
    hubChoiceMatchThreshold: 60, // choices: 2/3
  },
}

// For the events in this list, we should not include nodes that have the
// choiceLabel === 'default' OR text === 'default'
// Skip those nodes along with their entire subtree.
const DEFAULT_NODE_BLACKLIST = ['A Familiar Face']

// Toggle optimization/debug passes without commenting code.
// Keep defaults as "true" to preserve current behavior.
const OPTIMIZATION_PASS_CONFIG = {
  // === OPTIMIZATION PASSES DURING TREE BUILDING ===

  // Text-based loop detection:
  // - If dialogue text repeats in the ancestor chain, create a ref immediately.
  // - Prevents infinite dialogue loops.
  TEXT_LOOP_DETECTION_ENABLED: true,

  // Choice + story-path loop detection:
  // - Hashes: (choice labels + Ink story path).
  // - Creates refs to prevent merchant/shop loops where choices repeat.
  CHOICE_AND_PATH_LOOP_DETECTION_ENABLED: true,

  // Dialogue menu hub detection (whitelisted via DIALOGUE_MENU_EVENTS):
  // - Detects "dialogue menu" hubs and collapses loops by inserting refs.
  // - With hubChoiceMatchThreshold: delayed hub return detection (build child, then ref it).
  // - Without hubChoiceMatchThreshold: immediate ref creation mode (faster, smaller trees).
  DIALOGUE_MENU_EVENTS: DIALOGUE_MENU_EVENTS,

  // Path convergence early dedup (whitelisted via PATH_CONVERGENCE):
  // - If we reach the same node state (text + choices) via different routes, create a ref.
  // - Depth-first early dedup
  // - skipPatterns: text patterns to exclude from path convergence (let post-processing handle them)
  PATH_CONVERGENCE: {
    'Frozen Heart': {
      skipPatterns: [
        'You make your way up to the peak, only to reveal a final challenge',
        'A large chasm greets you on the other side',
        'A masterful illusion',
        'The simple chamber presents two obvious choices',
      ],
    },
  },
  PATH_CONVERGENCE_DEDUP_MIN_CHOICES: 3, // Only apply to nodes with at least this many choices

  // === POST-PROCESSING PIPELINE ===
  // Execution order (optimized for semantic-first, then structural optimization):
  // 1. FILTER_DEFAULT_NODES
  // 2. SEPARATE_CHOICES_FROM_EFFECTS
  // 3. PROMOTE_SHALLOW_DIALOGUE_MENU_HUB (depends on #2)
  // 4. POST_PROCESSING_HUB_PATTERN_OPTIMIZATION (semantic hub detection runs before structural dedup)
  // 5. DEDUPLICATE_SUBTREES (structural dedup after semantic passes)
  // 6. NORMALIZE_REFS_POINTING_TO_CHOICE_NODES
  // 7. NORMALIZE_REFS_POINTING_TO_COMBAT_NODES
  // 8. CONVERT_SIBLING_AND_COUSIN_REFS_TO_REF_CHILDREN
  // 9. APPLY_EVENT_ALTERATIONS
  // 10. CHECK_INVALID_REFS
  // 11. CLEAN_UP_RANDOM_VALUES
  //
  // Remove nodes with `choiceLabel === 'default'` or `text === 'default'`
  // See DEFAULT_NODE_BLACKLIST for events that should be filtered.
  FILTER_DEFAULT_NODES_ENABLED: true,

  // Split mixed nodes into: choice wrapper -> outcome node (effects/text/children).
  // This also normalizes rendering and helps later passes reason about refs (e.g. deduplication).
  SEPARATE_CHOICES_FROM_EFFECTS_ENABLED: true,

  // For threshold-based dialogue menu events, promote the shallowest hub copy to be canonical.
  // This fixes the timing issue where separateChoicesFromEffects() creates outcome nodes,
  // making the shallowest hub copy available. Runs right after SEPARATE_CHOICES_FROM_EFFECTS.
  // (see `promoteShallowDialogueMenuHub()` for details).
  PROMOTE_SHALLOW_DIALOGUE_MENU_HUB_ENABLED: true,

  // Automatically detect dialogue menu hub patterns and create refs in post-processing.
  // Uses independent BFS-based detection (doesn't rely on inline hub detection config).
  // Runs BEFORE structural deduplication to prioritize semantic hub optimization.
  // See: scripts/optimizationIdeas/auto-detect-dialogue-menu-hubs.md
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED: true,

  // Minimum number of choice children for hub candidates
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_CHOICES: 3,

  // Events to apply hub pattern optimization (Phase 2: ref creation)
  // Other events will still be detected and logged for discovery, but won't have refs created
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_WHITELIST: [
    'A Familiar Face',
    'A Strange Painting',
    'Abandoned Backpack',
    'Axe in the Stone',
    'Battleseer Hildune Death',
    'Brightcandle Consul',
    'Dawnbringer Ystel',
    "Heroes' Rest Cemetery Start",
    'Historic Shard',
    'Isle of Talos',
    'Kaius Tagdahar Death',
    'Rotting Residence',
    'Survey the Field',
    'Statue of Ilthar II Death',
    'Sunfall Meadows Start',
  ],

  // TODO: BLACKLIST:
  // Mysterious Crates - Has a set of 2 choices that are identical to hub, but completely different!

  // Structural subtree deduplication (breadth-first):
  // - Replaces structurally identical subtrees with refs, preferring shallow originals.
  // - Runs AFTER hub optimization passes to let semantic detection handle dialogue patterns first.
  // - Multiple iterations catch cascading duplicates that appear after first-pass deduplication.
  DEDUPLICATE_SUBTREES_NUM_ITERATIONS: 2,
  DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE: 3, // Only dedupe if subtree has at least this many nodes
  // How many levels deep to include in the signature for deduplication comparison.
  // Depth 1 = immediate children only, 2 = children + grandchildren, 3 = + great-grandchildren, etc.
  // Higher values catch more structural differences but have minimal performance impact.
  DEDUPLICATE_SUBTREES_SIGNATURE_DEPTH: 3,
  // TODO: This can probably be removed now?
  DEDUPLICATE_SUBTREES_EVENT_BLACKLIST: [],

  // Rewrite refs so non-choice nodes never target a choice wrapper node.
  // E.g. a dialogue node's ref shouldn't point to a choice wrapper node, but rather the outcome node.
  NORMALIZE_REFS_POINTING_TO_CHOICE_NODES_ENABLED: true,

  // Apply manual fixes from `scripts/parse/event-alterations.js`.
  // For manually adding or modifying nodes that were too difficult to parse automatically.
  APPLY_EVENT_ALTERATIONS_ENABLED: true,

  // Convert certain refs (sibling/simple cousin) into `refChildren` for nicer visualization.
  CONVERT_SIBLING_AND_COUSIN_REFS_TO_REF_CHILDREN_ENABLED: true,
  // Some complex trees get weird horizontal spacing issues when this pass reorders parents
  COUSIN_REF_BLACKLIST: [
    'Vesparin Vault',
    'TempleOffering',
    'Frozen Heart',
    'The Defiled Sanctum',
    'The Ferryman',
    'Warfront Survivor',
  ],
  COMPLEX_COUSIN_REF_BLACKLIST: [
    'Brightcandle Inn',
    'Damsel in Distress',
    'Suspended Cage',
    'The Priestess',
  ],

  // Validate refs (detect refs pointing to missing nodes) and log warnings.
  CHECK_INVALID_REFS_ENABLED: true,

  // Replace numeric gold in node text with «random» when effects say "GOLD: random [min - max]".
  CLEAN_UP_RANDOM_VALUES_ENABLED: true,
}

const CONFIG = {
  MAX_DEPTH: 100, // Limit depth for performance

  // SIBLING-FIRST EXPLORATION:
  // At shallow depths, we explore all siblings at each level before going deeper.
  // This ensures all major branches are explored even if one branch is very complex.
  // How it works: At each shallow level, we save story states for all choices,
  // then recursively explore each one. This allows all siblings to START their
  // exploration before the node limit kicks in.
  SIBLING_FIRST_DEPTH: 8, // Explore each sibling all the way until we reach this depth
  SIBLING_FIRST_NODE_BUDGET: 1000000, // Max nodes to create during sibling-first phase

  // DEPTH-FIRST EXPLORATION:
  // After sibling-first phase, we switch to standard depth-first exploration.
  // Node counter is RESET when first entering depth-first phase for this event.
  DEPTH_FIRST_NODE_BUDGET: 500000, // Max nodes to create during depth-first phase
}

module.exports = {
  DEFAULT_NODE_BLACKLIST,
  OPTIMIZATION_PASS_CONFIG,
  CONFIG,
}
