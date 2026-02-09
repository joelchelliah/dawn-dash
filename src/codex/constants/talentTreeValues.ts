/**
 * Constants for talent tree rendering and layout calculations.
 */

// ============================================================================
// Node Dimensions
// ============================================================================

const NODE_WIDTH = 200

export const TREE = {
  PADDING: {
    LEFT: 70, // Prevents `Obtained from events` node label from being cut off
    RIGHT: 10,
    VERTICAL: 40,
  },
} as const

export const NODE = {
  /** Standard width for talent node rectangles */
  WIDTH: NODE_WIDTH,

  /** Height components for different sections of talent nodes */
  HEIGHT: {
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

  /** Card set-specific constants */
  CARD_SET: {
    HEIGHT: 8,
    VERTICAL_MARGIN: 10,
  },

  /** Name-specific constants */
  NAME: {
    HEIGHT: 10,
    HEIGHT_NO_DESCRIPTION: 14,
    VERTICAL_MARGIN: 10,
    REALLY_LONG_THRESHOLD: 24,
  },

  /** Additional requirements-specific constants */
  ADDITIONAL_REQUIREMENTS: {
    HEIGHT: 8,
    HEIGHT_NO_DESCRIPTION: 9,
    VERTICAL_MARGIN: 6,
    VERTICAL_MARGIN_NO_DESCRIPTION: 7,
  },

  /** Description-specific constants */
  DESCRIPTION: {
    LINE_HEIGHT: 14,
    HORIZONTAL_MARGIN: 8,
    VERTICAL_MARGIN: 8,
  },

  /** Blightbane link-specific constants */
  BLIGHTBANE_LINK: {
    HEIGHT: 8,
    VERTICAL_MARGIN: 10,
  },
} as const

export const REQUIREMENT_NODE = {
  RADIUS_DEFAULT: 28,
  RADIUS_BY_REQUIREMENT_COUNT: {
    1: 14,
    2: 16,
    3: 26,
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

  LABEL_LINE_HEIGHT: 18,
  LABEL_BOTTOM_MARGIN: 2,
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
