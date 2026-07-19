/**
 * Pass toggles and tuning knobs for the parse pipeline.
 *
 * Per-event special-casing (dialogue-menu hubs, blacklists, validation ignore rules,
 * aliases, manual alterations, ...) lives in event-overrides.js; the relevant
 * structures are spread into OPTIMIZATION_PASS_CONFIG below so passes can keep
 * reading everything from one config object.
 */
const {
  DIALOGUE_MENU_EVENTS,
  PATH_CONVERGENCE,
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST,
  COUSIN_REF_BLACKLIST,
  COMPLEX_COUSIN_REF_BLACKLIST,
} = require('./event-overrides.js')

const RANDOM_KEYWORD = '«random»'

// Toggle optimization/debug passes without commenting code.
// Keep defaults as "true" to preserve current behavior.
const OPTIMIZATION_PASS_CONFIG = {
  // === OPTIMIZATION PASSES DURING TREE BUILDING ===

  // Text-based loop detection:
  // - If dialogue text repeats on the current root-to-leaf path, create a ref immediately.
  // - Prevents infinite dialogue loops (e.g. The Ferryman).
  // - Cross-branch dedup is intentionally NOT done here as it messes up refs!
  TEXT_LOOP_DETECTION_ENABLED: true,
  TEXT_LOOP_DETECTION_MIN_LENGTH: 20,
  TEXT_LOOP_DETECTION_IGNORE_PATTERNS: [RANDOM_KEYWORD],

  // Choice + story-path loop detection:
  // - Hashes: (choice labels + Ink story path).
  // - Creates refs to prevent merchant/shop loops where choices repeat.
  CHOICE_AND_PATH_LOOP_DETECTION_ENABLED: true,

  // Dialogue menu hub detection (whitelisted via DIALOGUE_MENU_EVENTS in event-overrides.js):
  // - Detects "dialogue menu" hubs and collapses loops by inserting refs.
  // - With hubChoiceMatchThreshold: delayed hub return detection (build child, then ref it).
  // - Without hubChoiceMatchThreshold: immediate ref creation mode (faster, smaller trees).
  DIALOGUE_MENU_EVENTS: DIALOGUE_MENU_EVENTS,

  // Path convergence early dedup (whitelisted via PATH_CONVERGENCE in event-overrides.js):
  // - If we reach the same node state (text + choices) via different routes, create a ref.
  // - Depth-first early dedup
  PATH_CONVERGENCE: PATH_CONVERGENCE,
  PATH_CONVERGENCE_DEDUP_MIN_CHOICES: 3, // Only apply to nodes with at least this many choices

  // === POST-PROCESSING PIPELINE ===
  // Execution order is defined by the PIPELINE registry in parse-event-trees.js —
  // these flags only toggle individual passes on/off.
  //
  // Remove nodes with `choiceLabel === 'default'` or `text === 'default'`
  // See DEFAULT_NODE_BLACKLIST (event-overrides.js) for events that should be filtered.
  FILTER_DEFAULT_NODES_ENABLED: true,

  // Split mixed nodes into: choice wrapper -> outcome node (effects/text/children).
  // This also normalizes rendering and helps later passes reason about refs (e.g. deduplication).
  SEPARATE_CHOICES_FROM_EFFECTS_ENABLED: true,

  // This fixes the timing issue where separateChoicesFromEffects() creates outcome nodes,
  // making the shallowest hub copy available. Runs right after SEPARATE_CHOICES_FROM_EFFECTS.
  // Currently only needed for Frozen Heart!
  PROMOTE_SHALLOW_DIALOGUE_MENU_HUB_ENABLED: true,

  // Automatically detect dialogue menu hub patterns and create refs in post-processing.
  // Uses independent BFS-based detection (doesn't rely on inline hub detection config).
  // Runs BEFORE structural deduplication to prioritize semantic hub optimization.
  // See: scripts/optimizationIdeas/auto-detect-dialogue-menu-hubs.md
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_ENABLED: true,

  // Minimum number of choice children for hub candidates
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_MIN_CHOICES: 3,

  // Known false positives excluded from hub-pattern optimization (event-overrides.js)
  POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST:
    POST_PROCESSING_HUB_PATTERN_OPTIMIZATION_BLACKLIST,

  // Structural subtree deduplication (breadth-first):
  // - Replaces structurally identical subtrees with refs, preferring shallow originals.
  // - Runs AFTER hub optimization passes to let semantic detection handle dialogue patterns first.
  // - Identity is exact (bottom-up subtree hashing, all depths); passes repeat until no
  //   more duplicates are found, since a collapsed duplicate can make its ancestor match
  //   a subtree that already contained an equivalent ref.
  DEDUPLICATE_SUBTREES_ENABLED: true,
  DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE: 3, // Only dedupe if subtree has at least this many nodes

  // Rewrite refs so non-choice nodes never target a choice wrapper node.
  // E.g. a dialogue node's ref shouldn't point to a choice wrapper node, but rather the outcome node.
  NORMALIZE_REFS_POINTING_TO_CHOICE_NODES_ENABLED: true,

  // Apply manual fixes from `scripts/parse/event-alterations.js`.
  // For manually adding or modifying nodes that were too difficult to parse automatically.
  APPLY_EVENT_ALTERATIONS_ENABLED: true,

  // Convert certain refs (sibling/simple cousin) into `refChildren` for nicer visualization.
  CONVERT_SIBLING_AND_COUSIN_REFS_TO_REF_CHILDREN_ENABLED: true,
  // Layout-problem escape hatches for that pass (event-overrides.js)
  COUSIN_REF_BLACKLIST: COUSIN_REF_BLACKLIST,
  COMPLEX_COUSIN_REF_BLACKLIST: COMPLEX_COUSIN_REF_BLACKLIST,

  // Delete refChildren stand-in nodes that are pure copies of their target (identical on
  // every rendered field) and their parent's only child: the parent points its converging
  // line directly at the original node instead.
  HOIST_PURE_STAND_IN_REF_NODES_ENABLED: true,

  // Run structural dedup a second time AFTER event alterations: alterations can grow
  // previously-too-small subtrees past DEDUPLICATE_SUBTREES_MIN_SUBTREE_SIZE (e.g. boss
  // transitions add a "GOTO EVENT: ..." child to every copy of a combat node, turning
  // each duplicated choice → combat pair into an eligible 3-node chain), which the main
  // dedup pass (running earlier) can't see. New duplicates become `ref` jump links.
  DEDUPLICATE_SUBTREES_POST_ALTERATIONS_ENABLED: true,

  // Merge duplicate combat nodes AFTER the post-alteration dedup: catches the copies that
  // pass can't, i.e. combat copies reached via non-identical choice wrappers whose own
  // subtrees stay below the dedup size gate. Deeper identical copies become `ref` jump
  // links. Childless copies are left alone — merging a leaf removes no nodes.
  MERGE_DUPLICATE_COMBAT_NODES_ENABLED: false,

  // Validate refs (detect refs pointing to missing nodes) and log warnings.
  CHECK_INVALID_REFS_ENABLED: true,

  // Replace numeric gold in node text with «random» when effects say "GOLD: random [min - max]".
  CLEAN_UP_RANDOM_VALUES_ENABLED: true,
}

const CONFIG = {
  MAX_DEPTH: 100, // Limit depth for performance
  NODE_BUDGET: 30000, // Max nodes to create per event
}

module.exports = {
  OPTIMIZATION_PASS_CONFIG,
  CONFIG,
  RANDOM_KEYWORD,
}
