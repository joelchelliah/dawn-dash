/**
 * Talent tree text measurement and wrapping utilities.
 *
 * Provides hybrid approach:
 * - Canvas-based measurement in browser (pixel-perfect accuracy)
 * - Estimation-based fallback for SSR (maintains functionality)
 */

import { measureTextWidth, wrapTextByCanvas, type FontConfig } from './canvasTextMeasurement'

/**
 * Font configuration for different talent node text types.
 * Must match the SCSS font-size definitions.
 */
type TalentFontConfig = FontConfig | 'nameCollapsed' | 'nameCollapsedLong'

/**
 * Approximate character width in pixels for different font types.
 * These values are empirically derived to match the actual rendered font metrics
 * and are used as fallback when Canvas is not available (e.g., during SSR).
 *
 * Font configurations:
 * - default: 12px, normal weight (description text)
 * - nameCollapsed: 18px, 600 weight (talent names when collapsed)
 * - nameCollapsedLong: 14px, 600 weight (long talent names when collapsed)
 */
const APPROX_PIXELS_PER_CHARACTER = {
  default: 6.4,
  defaultUppercase: 8.2,
  nameCollapsed: 10.5,
  nameCollapsedUppercase: 12.5,
  nameCollapsedLong: 8.2,
  nameCollapsedLongUppercase: 9.5,
  space: 3,
}

/**
 * Measures text width using hybrid approach:
 * - Canvas API when available (browser)
 * - Estimation when Canvas unavailable (SSR)
 */
export const measureTalentTextWidth = (
  text: string,
  fontType: TalentFontConfig = 'default'
): number => {
  // Try canvas measurement first for standard font configs
  if (fontType === 'default' || fontType === 'choice' || fontType === 'special') {
    const canvasWidth = measureTextWidth(text, fontType)
    if (canvasWidth !== null) return canvasWidth
  }

  // For talent-specific fonts or SSR fallback
  return estimateTalentTextWidth(text, fontType)
}

/**
 * Wraps text into multiple lines using hybrid approach:
 * - Canvas API when available (browser)
 * - Estimation when Canvas unavailable (SSR)
 */
export const wrapTalentText = (
  text: string,
  maxWidth: number,
  fontType: TalentFontConfig = 'default'
): string[] => {
  // Try canvas wrapping for standard font configs
  if (fontType === 'default' || fontType === 'choice' || fontType === 'special') {
    const canvasResult = wrapTextByCanvas(text, maxWidth, fontType)
    if (canvasResult.length > 0 && canvasResult[0] !== undefined) {
      return canvasResult
    }
  }

  // For talent-specific fonts or SSR fallback
  return estimateTalentTextWrapping(text, maxWidth, fontType)
}

/**
 * Estimates text width using character-based calculation.
 * Used as fallback when Canvas is not available (e.g. in SSR).
 */
const estimateTalentTextWidth = (text: string, fontConfig: TalentFontConfig): number => {
  let base: number
  let upper: number

  switch (fontConfig) {
    case 'nameCollapsed':
      base = APPROX_PIXELS_PER_CHARACTER.nameCollapsed
      upper = APPROX_PIXELS_PER_CHARACTER.nameCollapsedUppercase
      break
    case 'nameCollapsedLong':
      base = APPROX_PIXELS_PER_CHARACTER.nameCollapsedLong
      upper = APPROX_PIXELS_PER_CHARACTER.nameCollapsedLongUppercase
      break
    case 'choice':
      base = APPROX_PIXELS_PER_CHARACTER.default
      upper = APPROX_PIXELS_PER_CHARACTER.defaultUppercase
      break
    default:
      base = APPROX_PIXELS_PER_CHARACTER.default
      upper = APPROX_PIXELS_PER_CHARACTER.defaultUppercase
  }

  let width = 0
  for (const char of text) {
    if (char === ' ') {
      width += APPROX_PIXELS_PER_CHARACTER.space
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
const estimateTalentTextWrapping = (
  text: string,
  maxWidth: number,
  fontType: TalentFontConfig
): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i]
    const testWidth = estimateTalentTextWidth(testLine, fontType)

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
