/**
 * Constants for event tree rendering and layout calculations
 */

export const TREE = {
  HORIZONTAL_PADDING: 20,
  VERTICAL_PADDING: 5,
  MIN_SVG_WIDTH: 500, // Minimum SVG width to prevent nodes from appearing too large
}

const MIN_NODE_WIDTH = 200
const MIN_NODE_HEIGHT = 30
const DEFAULT_NODE_HORIZONTAL_SPACING = 25
const DEFAULT_NODE_VERTICAL_SPACING = 100

export const NODE = {
  MIN_WIDTH: MIN_NODE_WIDTH,
  MIN_HEIGHT: MIN_NODE_HEIGHT,

  // [Horizontal spacing, Vertical spacing]
  // Distance between node A start and node B start,
  // - At [0,0] the nodes will be completely overlapped.
  // - At [width, height] the nodes will be touching.
  DEFAULT_SIZE_WITH_SPACING: [
    MIN_NODE_WIDTH + DEFAULT_NODE_HORIZONTAL_SPACING,
    MIN_NODE_HEIGHT + DEFAULT_NODE_VERTICAL_SPACING,
  ] as [number, number],
}

const TEXT_LINE_HEIGHT = 12
const CHOICE_TEXT_HEIGHT = 14
const COMBAT_TEXT_HEIGHT = 14
const EVENT_NAME_HEIGHT = 20

export const TEXT = {
  LINE_HEIGHT: TEXT_LINE_HEIGHT,
  CHOICE_TEXT_HEIGHT: CHOICE_TEXT_HEIGHT,
  COMBAT_TEXT_HEIGHT: COMBAT_TEXT_HEIGHT,
  EVENT_NAME_HEIGHT: EVENT_NAME_HEIGHT,
  HORIZONTAL_PADDING: 10,

  // Max number of text lines to display for dialogue and end nodes
  MAX_DISPLAY_LINES: 2,

  // SVG text is positioned by baseline, not top of text!
  // We offset to position the first line's baseline for better visual centering
  BASELINE_OFFSET: 0.8 * TEXT_LINE_HEIGHT,
  CHOICE_BASELINE_OFFSET: 0.8 * CHOICE_TEXT_HEIGHT,
  COMBAT_BASELINE_OFFSET: 0.8 * COMBAT_TEXT_HEIGHT,
  EVENT_NAME_BASELINE_OFFSET: 0.8 * EVENT_NAME_HEIGHT,
}

export const NODE_BOX = {
  // Padding for entire node content
  VERTICAL_PADDING: 6,
}

export const INNER_BOX = {
  // 'Repeatable' and 'Continue' indicator heights
  INDICATOR_HEIGHT: 24,

  // Gap between main node text and indicator boxes (Repeatable, Continue)
  INDICATOR_TOP_MARGIN: 6,

  // Vertical padding for listings ('Requirements' and 'Effects')
  LISTINGS_VERTICAL_PADDING: 12,

  // Gap between main node text and listing boxes (Requirements, Effects)
  LISTINGS_TOP_MARGIN: 8,

  // Gap between listing header ('Requires:', 'Effects:') and first item
  LISTINGS_HEADER_GAP: 4,

  // Horizontal margin for the boxes containing the listings ('Requirements' and 'Effects')
  HORIZONTAL_MARGIN: 5,
}
