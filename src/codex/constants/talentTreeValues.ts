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

  /** Card set-specific constants */
  CARD_SET: {
    HEIGHT: 8,
    TOP_MARGIN: -2,
    BOTTOM_MARGIN: 10,
  },

  /** Name-specific constants */
  NAME: {
    HEIGHT: 10,
    HEIGHT_NO_DESCRIPTION: 14,
    VERTICAL_MARGIN: 10,
    REALLY_LONG_THRESHOLD: 24,
  },

  /** Artwork-specific constants. */
  ARTWORK: {
    /** Gap between the artwork and the name text, and the name's inset from the right edge */
    GAP: 8,
    /**
     * Extra height added to the name row when artwork is shown, giving the art more focus.
     */
    EXTRA_ROW_HEIGHT: 12,
    /**
     * How much wider the visible artwork is than it is tall, using up horizontal space the
     * square source would otherwise waste. The image is scaled to cover this wider window and
     * clipped to it, so only the middle horizontal band of the art shows.
     */
    WIDTH_SCALE: 1.75,
    /**
     * Width of the fade-to-transparent at the artwork's right edge.
     */
    FADE_WIDTH: 30,
    /**
     * Max width for the name before it's truncated with an ellipsis, as a fraction of the
     * space left over beside a *square* artwork. Widening via WIDTH_SCALE deliberately does not
     * shrink this — the name holds its place and the fade handles the overlap.
     */
    NAME_MAX_WIDTH_RATIO: 0.95,
  },

  /** Corner radius of the node rectangle — must match `.talent-node`'s `rx`/`ry` in the stylesheet */
  CORNER_RADIUS: 8,

  /**
   * Border width of the node rectangle — must match `.talent-node`'s `stroke-width`.
   * SVG strokes straddle the edge, so flush content starts half a stroke inside the node's
   * nominal bounds to avoid sitting under the border.
   */
  BORDER_WIDTH: 2,

  /** Additional requirements-specific constants */
  ADDITIONAL_REQUIREMENTS: {
    HEIGHT: 14,
    HEIGHT_NO_DESCRIPTION: 4,
    VERTICAL_MARGIN: 1,
    VERTICAL_MARGIN_NO_DESCRIPTION: 8,
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

  /** Keywords-specific constants */
  KEYWORDS: {
    HEIGHT: 8,
    TOP_MARGIN: 10,
    BOTTOM_MARGIN: -2,
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

  LABEL_LINE_HEIGHT: 20,
  LABEL_BOTTOM_MARGIN: 2,
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
