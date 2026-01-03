/**
 * Constants for event tree rendering and layout calculations
 */

export const TREE = {
  HORIZONTAL_PADDING: 20,
  VERTICAL_PADDING: 5,
}

export const NODE = {
  MIN_WIDTH: 200,
  MIN_HEIGHT: 30,
  DEFAULT_SIZE: [225, 150] as [number, number],
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
  HORIZONTAL_PADDING: 20,

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

  // Gap between event name and dialogue text in root nodes
  ROOT_DIALOGUE_TOP_MARGIN: 6,
}

export const INNER_BOX = {
  // 'Repeatable' and 'Continue' indicator heights
  INDICATOR_HEIGHT: 22,

  // Gap between main node text and indicator boxes (Repeatable, Continue)
  INDICATOR_TOP_MARGIN: 8,

  // Vertical padding for listings ('Requirements' and 'Effects')
  LISTINGS_VERTICAL_PADDING: 12,

  // Gap between main node text and listing boxes (Requirements, Outcome, Effects)
  LISTINGS_TOP_MARGIN: 6,

  // Gap between listing header ('Requires:', 'Outcome:', 'Effects:') and first item
  LISTINGS_HEADER_GAP: 4,

  // Horizontal margin for the boxes containing the listings ('Requirements' and 'Effects')
  HORIZONTAL_MARGIN: 5,
}
