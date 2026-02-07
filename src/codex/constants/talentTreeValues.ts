/**
 * Constants for talent tree rendering and layout calculations.
 */

// ============================================================================
// Node Dimensions
// ============================================================================

export const NODE = {
  /** Standard width for talent node rectangles */
  WIDTH: 200,

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

  /** Spacing multipliers for node separation */
  SPACING: {
    /** Default horizontal spacing: nodeWidth * 1.3625 */
    HORIZONTAL_MULTIPLIER: 1.3625,
    /** Vertical spacing for expanded descriptions */
    VERTICAL_EXPANDED_MULTIPLIER: 1.7,
    /** Vertical spacing for collapsed descriptions */
    VERTICAL_COLLAPSED_MULTIPLIER: 2.8,
  },

  /** Padding and offsets for various node elements */
  PADDING: {
    /** Extra padding for description lines to create spacing */
    DESCRIPTION_LINES: 12,
    /** Offset for left side of tree */
    LEFT_MULTIPLIER: 0.25,
  },

  /** Glow effect dimensions */
  GLOW: {
    /** Additional width for glow effect around node */
    EXTRA_WIDTH: 6,
    /** Additional height for glow effect around node */
    EXTRA_HEIGHT: 6,
    /** Standard deviation for Gaussian blur filter */
    BLUR_STD_DEVIATION: 8,
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

export const TREE = {
  /** Default vertical spacing between nodes */
  DEFAULT_VERTICAL_SPACING: 100,

  /** Horizontal padding on edges of tree */
  HORIZONTAL_PADDING: 50,

  /** Vertical padding on top and bottom of tree */
  VERTICAL_PADDING: {
    TOP: 40,
    BOTTOM: 1500,
  },

  /** SVG viewBox vertical padding */
  SVG_VERTICAL_PADDING: 40,

  /** Minimum factor to ensure everything fits in container */
  MIN_FIT_FACTOR: 0.955,

  /** Base width for tree (at depth 4) */
  BASE_WIDTH: 1050,

  /** Minimum tree width */
  MIN_WIDTH: 400,

  /** Depth divisor for width scaling */
  BASE_DEPTH: 4,

  /** Separation multiplier for nodes with different parents */
  DIFFERENT_PARENT_SEPARATION_MULTIPLIER: 1.375,
} as const

export const LINK = {
  /** X offset for link positioning */
  X_OFFSET: 2,
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
