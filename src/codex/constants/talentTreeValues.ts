/**
 * Constants for talent tree rendering and layout calculations.
 */

// ============================================================================
// Node Dimensions
// ============================================================================

const NODE_WIDTH = 200

export const TREE = {
  PADDING: {
    LEFT: 50, // Prevents `No Requirements` node label from being cut off
    RIGHT: 10,
    VERTICAL: 40,
  },
} as const

export const NODE = {
  /** Standard width for talent node rectangles */
  WIDTH: NODE_WIDTH,

  /** Height components for different sections of talent nodes */
  HEIGHT: {
    /** Height of the name section */
    NAME: 30,
    /** Minimum height for description section */
    MIN_DESCRIPTION: 15,
    /** Height when description is collapsed */
    COLLAPSED_DESCRIPTION: 4,
    /** Height for additional requirements text */
    REQUIREMENTS: 16,
    /** Height for matching keywords section */
    KEYWORDS: 20,
    /** Height for Blightbane link section */
    BLIGHTBANE_LINK: 26,
  },

  SPACING: {
    HORIZONTAL: NODE_WIDTH + 100,
    /** Base vertical spacing for D3 layout calculation */
    VERTICAL_BASE: 100,
    /** Fixed gap between nodes (edge to edge) */
    VERTICAL_GAP: 30,
    /** Multiplier for spacing between nodes from different parent branches */
    VERTICAL_GAP_MULTIPLIER_DIFFERENT_PARENTS: 1.25,
  },

  // Additional size of the glow rectangle
  GLOW_SIZE: 6,

  /** Padding and offsets for various node elements */
  PADDING: {
    /** Extra padding for description lines to create spacing */
    DESCRIPTION_LINES: 12,
  },

  /** Name-specific constants */
  NAME: {
    /** Character count threshold for "really long" names */
    REALLY_LONG_THRESHOLD: 24,
    /** Y offset for collapsed node names */
    Y_COLLAPSED: 10,
    /** Y offset for expanded node names */
    Y_EXPANDED: 4,
  },
} as const

export const REQUIREMENT_NODE = {
  /** Base radius for requirement node circles */
  RADIUS: 28,

  /** Circle radius divisors for different energy counts */
  RADIUS_DIVISOR: {
    /** Single energy: radius / 2 */
    SINGLE: 2,
    /** Two energies: radius / 1.75 */
    DOUBLE: 1.75,
    /** Three energies: radius - 2 */
    TRIPLE_OFFSET: 2,
  },

  /** Icon sizes for different requirement types */
  ICON_SIZE: {
    /** Large icons for class/offer/event/card requirements */
    LARGE: 52,
    /** Small icons for energy requirements */
    SMALL: 22,
  },

  /** Spacing between multiple icons */
  ICON_SPACING: 2,

  /** Label rendering constants */
  LABEL: {
    /** Line height for multi-line labels */
    LINE_HEIGHT: 24,
  },
} as const

export const TEXT = {
  /** Line height for description text */
  LINE_HEIGHT: 15,

  /** Horizontal padding for text wrapping calculations */
  HORIZONTAL_PADDING: 5,

  /** Vertical centering offsets */
  CENTERING_OFFSET: {
    /** Desktop rendering vertical offset */
    DESKTOP: -15,
    /** Description lines base offset */
    DESCRIPTION: -1,
  },
} as const

export const REQUIREMENT_INDICATOR = {
  /** Base circle dimensions for requirement indicators on links */
  CIRCLE: {
    RX: 21,
    RY: 21,
  },

  /** Energy-specific dimensions for different counts */
  ENERGY: {
    SINGLE: {
      RX: 13,
      RY: 13,
      NUDGE: 6,
      SPACING: 0,
    },
    DOUBLE: {
      RX: 14,
      RY: 18,
      NUDGE: 6,
      SPACING: 4,
    },
    TRIPLE: {
      RX: 16,
      RY: 28,
      NUDGE: 6,
      SPACING: 2,
    },
  },

  /** Default horizontal nudge for positioning */
  DEFAULT_NUDGE: 12,

  /** Icon sizes */
  ICON_SIZE: {
    /** Icon size for energy requirements */
    ENERGY: 22,
    /** Icon size for class/other requirements */
    CLASS: 38,
  },

  /** Opacity for stacked icons */
  STACKED_ICON_OPACITY: 0.9,
} as const

export const EXPANSION_BUTTON = {
  /** Button positioning offsets */
  X_OFFSET: {
    EXPANDED: 6,
    COLLAPSED: 24,
  },

  /** Button dimensions */
  RADIUS: 14,
  HOVER_RADIUS_ADDITION: 4,

  /** Text positioning */
  TEXT_Y_OFFSET: -2,

  /** Button symbols */
  SYMBOL: {
    EXPANDED: '−',
    COLLAPSED: '+',
  },
} as const

export const SEPARATOR = {
  /** Offset for Blightbane link separator line */
  BLIGHTBANE_OFFSET: 2,
} as const
