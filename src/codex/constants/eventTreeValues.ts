/**
 * Constants for event tree rendering and layout calculations
 */

import { LevelOfDetail } from './eventSearchValues'

export const TREE = {
  HORIZONTAL_PADDING: 20,
  VERTICAL_PADDING_BY_LEVEL_OF_DETAIL: {
    [LevelOfDetail.COMPACT]: 30,
    [LevelOfDetail.BALANCED]: 20,
    [LevelOfDetail.WALL_OF_TEXT]: 20,
  },
  MIN_SVG_WIDTH: 500, // Minimum SVG width to prevent nodes from appearing too large
}

export const NODE = {
  WIDTH_RANGE: [95, 280],
  COMPACT_WIDTH: 40,

  HORIZONTAL_SPACING_DEFAULT: 50,
  VERTICAL_SPACING_DEFAULT: 80,
  VERTICAL_SPACING_SHORT_BY_LEVEL_OF_DETAIL: {
    [LevelOfDetail.COMPACT]: 50,
    [LevelOfDetail.BALANCED]: 40,
    [LevelOfDetail.WALL_OF_TEXT]: 40,
  },
  VERTICAL_SPACING_INCREMENT: 20,
}

const TEXT_LINE_HEIGHT = 14
const CHOICE_TEXT_HEIGHT = 16
const REPLACED_TEXT_HEIGHT = 16 // When showing 'FIGHT!' or 'END' in italic
const SPECIAL_TEXT_HEIGHT = 14
const EVENT_NAME_HEIGHT = 20

export const TEXT = {
  LINE_HEIGHT: TEXT_LINE_HEIGHT,
  SPECIAL_TEXT_HEIGHT: SPECIAL_TEXT_HEIGHT,
  CHOICE_TEXT_HEIGHT: CHOICE_TEXT_HEIGHT,
  REPLACED_TEXT_HEIGHT: REPLACED_TEXT_HEIGHT,
  HORIZONTAL_PADDING: 10,

  // Max number of text lines to display for dialogue and end nodes
  MAX_DISPLAY_LINES_BY_LEVEL_OF_DETAIL: {
    [LevelOfDetail.COMPACT]: 0,
    [LevelOfDetail.BALANCED]: 2,
    [LevelOfDetail.WALL_OF_TEXT]: 999,
  },

  // SVG text is positioned by baseline, not top of text!
  // We offset to position the first line's baseline for better visual centering
  BASELINE_OFFSET: 0.8 * TEXT_LINE_HEIGHT,
  CHOICE_BASELINE_OFFSET: 0.8 * CHOICE_TEXT_HEIGHT,
  SPECIAL_BASELINE_OFFSET: 0.8 * SPECIAL_TEXT_HEIGHT,
  REPLACED_TEXT_BASELINE_OFFSET: 0.95 * REPLACED_TEXT_HEIGHT,
  EVENT_NAME_BASELINE_OFFSET: 0.8 * EVENT_NAME_HEIGHT,
}

export const NODE_BOX = {
  // Padding for entire node content
  VERTICAL_PADDING: 6,

  // Additional size of the glow rectangle
  GLOW_SIZE: 6,
}

export const INNER_BOX = {
  // 'Loops back to' and 'Continue' indicator heights
  INDICATOR_HEIGHT: 24,

  // Gap between main node text and indicator boxes (Loops back to, Continue)
  // Or between 2 different indicator boxes
  INDICATOR_TOP_MARGIN: 6,

  // Additional top margin for indicator boxes when no text is shown, to not collide with emoji badges
  INDICATOR_TOP_MARGIN_COMPACT: 8,

  // Gap between indicator header ('Loops back to:') and label text
  INDICATOR_HEADER_GAP: 8,

  // Vertical padding for listings ('Requirements' and 'Effects')
  LISTINGS_VERTICAL_PADDING: 6,

  // Gap between main node text and listing boxes (Requirements, Effects)
  LISTINGS_TOP_MARGIN: 8,

  // Additional top margin for listing boxes when no text is shown, to not collide with emoji badges
  LISTINGS_TOP_MARGIN_COMPACT: 8,

  // Gap between listing header ('Requires:', 'Effects:') and first item
  LISTINGS_HEADER_GAP: 6,

  // Used:
  // - Horizontal margin for the boxes containing the listings ('Requirements' and 'Effects')
  // - Horizontal margin for the indicator boxes ('Loops back to' and 'Continue')
  // - Horizontal padding for the text inside BOTH types of boxes
  HORIZONTAL_MARGIN_OR_PADDING: 5,
}
