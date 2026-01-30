/**
 * Canvas-based text measurement utilities for accurate width calculations.
 *
 * This approach uses the browser's Canvas API to get pixel-perfect text measurements
 * that match the actual rendered font metrics. We sample the document's computed
 * font size (from rem) so measurements stay correct when root font size differs
 * (e.g. mobile "cover" zoom, iOS accessibility, or display zoom).
 */

/**
 * Font configuration matching the SCSS font-size definitions.
 * Size fallbacks are used when computed sampling is unavailable (SSR or probe failure).
 */
const FONT_CONFIGS = {
  // xxs
  default: { rem: '0.75rem', weight: 'normal', fallbackPx: 12 },
  // xs
  choice: { rem: '0.875rem', weight: '600', fallbackPx: 14 },
  special: { rem: '0.875rem', weight: '600', fallbackPx: 14 },
  indicatorHeader: { rem: '0.875rem', weight: '600', fallbackPx: 14 },
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

/** Cached computed font sizes (px) per font type. Invalidated on resize. */
let computedSizeCache: Partial<Record<FontConfig, number>> = {}
let lastResizeKey = 0

const getResizeKey = (): number =>
  typeof window === 'undefined' ? 0 : window.innerWidth + window.innerHeight * 1e6

/**
 * Invalidates the computed font-size cache. Call when zoom level or layout changes
 * (e.g. switching to "cover" on mobile) so the next measurement uses current document state.
 */
export const invalidateTextMeasurementCache = (): void => {
  lastResizeKey = 0
  computedSizeCache = {}
}

/**
 * Sample the document's computed font size for a font config.
 * SVG text uses rem (0.75rem, 0.875rem); on mobile/accessibility the root can differ,
 * so we must measure with the same computed px the SVG actually gets.
 */
const getComputedFontSizePx = (fontType: FontConfig): number => {
  const resizeKey = getResizeKey()
  if (resizeKey !== lastResizeKey) {
    lastResizeKey = resizeKey
    computedSizeCache = {}
  }
  const cached = computedSizeCache[fontType]
  if (cached !== undefined) return cached

  if (typeof document === 'undefined' || !document.body) return FONT_CONFIGS[fontType].fallbackPx

  const config = FONT_CONFIGS[fontType]
  const probe = document.createElement('div')
  probe.setAttribute('aria-hidden', 'true')
  Object.assign(probe.style, {
    position: 'absolute',
    left: '-9999px',
    visibility: 'hidden',
    fontFamily: FONT_FAMILY,
    fontSize: config.rem,
    fontWeight: config.weight,
  })
  document.body.appendChild(probe)
  try {
    const computed = getComputedStyle(probe).fontSize
    const px = parseFloat(computed)
    const value = Number.isFinite(px) ? px : config.fallbackPx
    computedSizeCache[fontType] = value
    return value
  } finally {
    document.body.removeChild(probe)
  }
}

/**
 * Measures the pixel width of text using Canvas API.
 * Uses the document's computed font size so it matches SVG text (rem-based) on all viewports.
 */
export const measureTextWidth = (text: string, fontType: FontConfig): number | null => {
  const ctx = getCanvasContext()
  if (!ctx) return null

  const config = FONT_CONFIGS[fontType]
  const sizePx = getComputedFontSizePx(fontType)
  ctx.font = `${config.weight} ${sizePx}px ${FONT_FAMILY}`

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
