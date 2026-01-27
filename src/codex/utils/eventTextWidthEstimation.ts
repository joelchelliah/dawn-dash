/**
 * Event tree text measurement and wrapping utilities.
 *
 * Provides hybrid approach:
 * - Canvas-based measurement in browser (pixel-perfect accuracy)
 * - Estimation-based fallback for SSR (maintains functionality)
 */

import { measureTextWidth, wrapTextByCanvas, type FontConfig } from './canvasTextMeasurement'

/**
 * Approximate character width in pixels for different font types.
 * These values are empirically derived to match the actual rendered font metrics
 * and are used as fallback when Canvas is not available (e.g., during SSR).
 *
 * Font configurations:
 * - default: 12px, normal weight (dialogue, effects, requirements, etc.)
 * - choice: 14px, 600 weight (choice labels)
 */
const APPROX_PIXELS_PER_CHARACTER = {
  default: 6.4,
  defaultUppercase: 8.2,
  choice: 8.2,
  choiceUppercase: 9.5,
  space: 3,
}

/**
 * Measures text width using hybrid approach:
 * - Canvas API when available (browser)
 * - Estimation when Canvas unavailable (SSR)
 */
export const measureEventTextWidth = (text: string, fontType: FontConfig = 'default'): number => {
  const canvasWidth = measureTextWidth(text, fontType)
  return canvasWidth !== null ? canvasWidth : estimateTextWidth(text, fontType)
}

/**
 * Wraps text into multiple lines using hybrid approach:
 * - Canvas API when available (browser)
 * - Estimation when Canvas unavailable (SSR)
 */
export const wrapEventText = (
  text: string,
  maxWidth: number,
  fontType: FontConfig = 'default'
): string[] => {
  // Try Canvas first
  const canvasResult = wrapTextByCanvas(text, maxWidth, fontType)

  // If Canvas returned valid result (non-empty), use it
  if (canvasResult.length > 0 && canvasResult[0] !== undefined) {
    return canvasResult
  }

  // Fallback to estimation
  return estimateTextWrapping(text, maxWidth, fontType)
}

/**
 * Estimates text width using character-based calculation.
 * Used as fallback when Canvas is not available (e.g. in SSR).
 */
const estimateTextWidth = (text: string, fontConfig: FontConfig): number => {
  const base =
    fontConfig === 'default'
      ? APPROX_PIXELS_PER_CHARACTER.default
      : APPROX_PIXELS_PER_CHARACTER.choice
  const upper =
    fontConfig === 'default'
      ? APPROX_PIXELS_PER_CHARACTER.defaultUppercase
      : APPROX_PIXELS_PER_CHARACTER.choiceUppercase

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
const estimateTextWrapping = (text: string, maxWidth: number, fontType: FontConfig): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i]
    const testWidth = estimateTextWidth(testLine, fontType)

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
