/**
 * Talent tree text measurement and wrapping utilities.
 *
 * Provides hybrid approach:
 * - Canvas-based measurement in browser (pixel-perfect accuracy)
 * - Estimation-based fallback for SSR (maintains functionality)
 */

import { measureTextWidth, wrapTextByCanvas } from './canvasTextMeasurement'

/**
 * Approximate character width in pixels for different font types.
 * These values are empirically derived to match the actual rendered font metrics
 * and are used as fallback when Canvas is not available (e.g., during SSR).
 */
const APPROX_PIXELS_PER_CHARACTER = {
  default: 6.4,
  defaultUppercase: 8.2,
  space: 3,
  emoji: 14, // Emojis are typically wider than regular characters at 12px font size
}

/**
 * Measures text width using hybrid approach:
 * - Canvas API when available (browser)
 * - Estimation when Canvas unavailable (SSR)
 */
export const measureTalentTextWidth = (text: string): number => {
  const parsedText = parseTalentText(text)
  const canvasWidth = measureTextWidth(parsedText, 'default')
  if (canvasWidth !== null) return canvasWidth

  // For talent-specific fonts or SSR fallback
  return estimateTalentTextWidth(parsedText)
}

/**
 * Wraps text into multiple lines using hybrid approach:
 * - Canvas API when available (browser)
 * - Estimation when Canvas unavailable (SSR)
 */
export const wrapTalentText = (text: string, maxWidth: number): string[] => {
  const parsedText = parseTalentText(text)
  const canvasResult = wrapTextByCanvas(parsedText, maxWidth, 'default')

  if (canvasResult.length > 0 && canvasResult[0] !== undefined) {
    return canvasResult
  }

  // For talent-specific fonts or SSR fallback
  return estimateTalentTextWrapping(parsedText, maxWidth)
}

/**
 * Estimates text width using character-based calculation.
 * Used as fallback when Canvas is not available (e.g. in SSR).
 */
const estimateTalentTextWidth = (text: string): number => {
  const base = APPROX_PIXELS_PER_CHARACTER.default
  const upper = APPROX_PIXELS_PER_CHARACTER.defaultUppercase
  const emoji = APPROX_PIXELS_PER_CHARACTER.emoji

  let width = 0
  for (const char of text) {
    const codePoint = char.codePointAt(0) || 0

    if (char === ' ') {
      width += APPROX_PIXELS_PER_CHARACTER.space
    } else if (isEmoji(codePoint)) {
      // Emoji detection using code point ranges
      width += emoji
    } else if (/[A-Z]/.test(char)) {
      width += upper
    } else {
      width += base
    }
  }
  return width
}

/**
 * Wraps text using character-based estimation.
 * Used as fallback when Canvas is not available (e.g. in SSR).
 */
const estimateTalentTextWrapping = (text: string, maxWidth: number): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i]
    const testWidth = estimateTalentTextWidth(testLine)

    if (testWidth > maxWidth) {
      lines.push(currentLine)
      currentLine = words[i]
    } else {
      currentLine = testLine
    }
  }

  lines.push(currentLine)
  return lines
}

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

const KEYWORD_TO_EMOJI_MAP: Record<string, string> = {
  HEALTH: ' ❤️',
  HOLY: ' 🟡',
  STR: ' 🔴',
  INT: ' 🔵',
  DEX: ' 🟢',
  NEUTRAL: ' ⚪',
  '\\(BLOOD\\)': '',
}

/**
 * Detects if a character code point is likely an emoji.
 * Covers common emoji ranges used in the talent tree.
 */
const isEmoji = (codePoint: number): boolean => {
  return (
    (codePoint >= 0x1f300 && codePoint <= 0x1f9ff) || // Misc Symbols and Pictographs, Emoticons, etc.
    (codePoint >= 0x2600 && codePoint <= 0x26ff) || // Misc symbols (⚪ etc.)
    (codePoint >= 0x2700 && codePoint <= 0x27bf) || // Dingbats
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) || // Variation Selectors
    (codePoint >= 0x1f000 && codePoint <= 0x1f02f) || // Mahjong Tiles, Domino Tiles
    (codePoint >= 0x1f0a0 && codePoint <= 0x1f0ff) // Playing Cards
  )
}
