/**
 * Talent tree text measurement: feature-specific font config and text parsing
 * on top of the shared tree text measurer.
 *
 * Talent descriptions contain markup (<br>, <b>, [[...]]) and resource keywords
 * (HEALTH, STR, ...) that render as emoji — so before measuring, the raw text is
 * parsed into the form that is actually displayed.
 */

import { createTextMeasurer } from './tree/textWidthEstimation'

// Resource keywords are rendered as emoji in the tree; measure them as such
const KEYWORD_TO_EMOJI_MAP: Record<string, string> = {
  HEALTH: ' ❤️',
  HOLY: ' 🟡',
  STR: ' 🔴',
  INT: ' 🔵',
  DEX: ' 🟢',
  NEUTRAL: ' ⚪',
  '\\(BLOOD\\)': '',
}

// Strips markup and rewrites brackets/keywords to match the rendered text
const parseTalentText = (text: string): string => {
  let result = text
    .replace(/<br\s*\/?>/g, '') // Remove <br> tags
    .replace(/<\/?[bB]>/g, '') // Remove <b> tags
    .replace(/<\/?nobr>/g, '') // Remove <nobr> tags
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )
    .trim()

  Object.entries(KEYWORD_TO_EMOJI_MAP).forEach(([keyword, emoji]) => {
    result = result.replace(new RegExp(keyword, 'g'), emoji)
  })
  return result
}

const talentTextMeasurer = createTextMeasurer({
  variants: {
    // xxs (12px, normal weight)
    default: { weight: 'normal', sizePx: 12, approxCharWidths: { base: 6.4, uppercase: 8.2 } },
  },
  approxSpaceWidth: 3,
  approxEmojiWidth: 14, // Emojis are typically wider than regular characters at 12px font size
  parseText: parseTalentText,
})

export const measureTalentTextWidth = (text: string): number =>
  talentTextMeasurer.measureTextWidth(text)

export const wrapTalentText = (text: string, maxWidth: number): string[] =>
  talentTextMeasurer.wrapText(text, maxWidth)
