/**
 * Canvas-based text measurement utilities for accurate width calculations.
 *
 * Uses the browser's Canvas API to get pixel-perfect text measurements that match
 * the actual rendered font metrics.
 */

/**
 * Font configuration matching the SCSS font-size definitions (xxs: 0.75rem, xs: 0.875rem).
 * Assumes 1rem = 16px. Error is small enough on mobile to skip computed sampling.
 */
const FONT_CONFIGS = {
  // xxs
  default: { weight: 'normal', sizePx: 12 },
  // xs
  choice: { weight: '600', sizePx: 14 },
  special: { weight: '600', sizePx: 14 },
  indicatorHeader: { weight: '600', sizePx: 14 },
} as const

export type FontConfig = keyof typeof FONT_CONFIGS

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

let canvasContext: CanvasRenderingContext2D | null = null

const getCanvasContext = (): CanvasRenderingContext2D | null => {
  if (canvasContext) return canvasContext
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    canvasContext = canvas.getContext('2d')
    return canvasContext
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to create canvas context for text measurement:', error)
    return null
  }
}

/**
 * Measures the pixel width of text using Canvas API.
 */
export const measureTextWidth = (text: string, fontType: FontConfig): number | null => {
  const ctx = getCanvasContext()
  if (!ctx) return null

  const config = FONT_CONFIGS[fontType]
  ctx.font = `${config.weight} ${config.sizePx}px ${FONT_FAMILY}`

  try {
    return ctx.measureText(text).width
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to measure text:', error)
    return null
  }
}

/**
 * Wraps text into multiple lines based on available width using Canvas measurements.
 * This ensures accurate word wrapping that matches actual rendered text.
 */
export const wrapTextByCanvas = (
  text: string,
  maxWidth: number,
  fontType: FontConfig
): string[] => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i]
    const testWidth = measureTextWidth(testLine, fontType)

    // If measurement fails, fall back to not wrapping this word
    if (testWidth === null) {
      currentLine = testLine
      continue
    }

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
