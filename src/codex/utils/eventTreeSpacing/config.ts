/**
 * Tuning knobs for the event-tree spacing engine.
 * See README.md in this folder for how the passes fit together.
 */

/**
 * Overlap resolution and gap tightening run repeated sweeps until a full sweep
 * makes no adjustment: fixing one overlap can create another elsewhere, and
 * tightening deep subtrees can unlock tightening higher up. The caps are a
 * safety net against non-converging trees — typically ones where a node is both
 * a direct child of one parent and a refChild of others (see README). Normal
 * trees settle within a few sweeps.
 */
export const MAX_OVERLAP_RESOLUTION_SWEEPS = 10
export const MAX_GAP_TIGHTENING_SWEEPS = 10

/**
 * Shifts smaller than this (px) are skipped: they're invisible at any zoom
 * level, and applying them would keep the sweep loops from ever settling.
 */
export const MIN_SHIFT_THRESHOLD = 1

/**
 * Multi-parent centering only moves a shared child when it's off-center by more
 * than this fraction of the minimum horizontal gap — recentering by less isn't
 * visible and risks ping-ponging against the overlap checks.
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
