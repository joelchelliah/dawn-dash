/**
 * Tuning knobs for the event-tree spacing engine.
 * See README.md in this folder for how the passes fit together.
 */

/**
 * Multi-parent centering only moves a shared child when it's off-center by more
 * than this fraction of the minimum horizontal gap — recentering by less isn't
 * visible.
 */
export const MULTI_PARENT_CENTERING_THRESHOLD_RATIO = 0.1

/**
 * Vertical spacing: for every this-many px of horizontal spread within a
 * sibling group, one extra NODE.VERTICAL_SPACING_INCREMENT is added to the gap
 * below the parent, so links to far-out children don't run nearly horizontal.
 */
export const HORIZONTAL_SPREAD_PX_PER_VERTICAL_INCREMENT = 1000

/**
 * Root centering only applies to trees with at most this many nodes (or trees
 * where every node has at most one child) — recentering larger trees runs into
 * out-of-bounds issues with the viewBox.
 */
export const SMALL_TREE_MAX_NODES = 4
