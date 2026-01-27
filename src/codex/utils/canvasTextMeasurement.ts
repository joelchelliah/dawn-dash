/**
 * Canvas-based text measurement utilities for accurate width calculations.
 *
 * This approach uses the browser's Canvas API to get pixel-perfect text measurements
 * that match the actual rendered font metrics, eliminating the need for estimated
 * character width constants.
 */

/**
 * Font configuration matching the SCSS font-size definitions.
 *
 * Usage-based naming:
 * - EVENT TREE:
 *    - default: Regular text (dialogue, effects, requirements, etc.) - xxs: 12px, normal weight
 *    - choice: Choice labels - xs: 14px, semi-bold (600 weight)
 */
const FONT_CONFIGS = {
  default: {
    size: 12, // font-size('xxs') = 0.75rem
    weight: 'normal',
  },
  choice: {
    size: 14, // font-size('xs') = 0.875rem
    weight: '600',
  },
  indicatorHeader: {
    size: 14,
    weight: '600',
  },
} as const

export type FontConfig = keyof typeof FONT_CONFIGS

/**
 * Font family matching what's used in the application.
 * This should match your CSS font stack for event tree text.
 */
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/**
 * Singleton canvas context for text measurements.
 * Created lazily on first use and reused for all subsequent measurements.
 */
let canvasContext: CanvasRenderingContext2D | null = null

/**
 * Gets or creates the singleton canvas context for text measurements.
 */
const getCanvasContext = (): CanvasRenderingContext2D | null => {
  if (canvasContext) {
    return canvasContext
  }

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return null
  }

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
 * This provides exact measurements that match browser rendering.
 */
export const measureTextWidth = (text: string, fontType: FontConfig): number | null => {
  const ctx = getCanvasContext()
  if (!ctx) {
    return null
  }

  const config = FONT_CONFIGS[fontType]
  ctx.font = `${config.weight} ${config.size}px ${FONT_FAMILY}`

  try {
    const metrics = ctx.measureText(text)
    return metrics.width
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
