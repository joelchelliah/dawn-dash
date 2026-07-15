/**
 * Shared tree text measurement and wrapping utilities (talent tree + event tree).
 *
 * Each feature creates its own measurer via `createTextMeasurer`, parameterized by
 * font variants, per-character width estimates, and optional text parsing.
 *
 * Every measurement follows the same flow:
 * 1. `parseText` (if configured) normalizes the input into the text that actually renders
 * 2. Canvas API measures it pixel-perfectly (browser)
 * 3. If Canvas is unavailable (SSR), fall back to per-character width estimation
 *
 * Wrapping is greedy word-wrap: words are added to the current line until the
 * measured width exceeds maxWidth, then a new line starts. A single word wider
 * than maxWidth is never split.
 */

import { logger } from '@/shared/utils/logger'

const DEFAULT_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/**
 * Approximate character widths in pixels for a font variant.
 * These values are empirically derived to match the actual rendered font metrics
 * and are used as fallback when Canvas is not available (e.g., during SSR).
 */
export interface ApproxCharWidths {
  base: number
  uppercase: number
}

export interface FontVariant {
  weight: string
  sizePx: number
  approxCharWidths: ApproxCharWidths
}

export interface TextMeasurerConfig<V extends string = never> {
  /** Font variants; 'default' is required, extra variants are feature-specific */
  variants: Record<V | 'default', FontVariant>
  /** Approximate width of a space character (estimation fallback) */
  approxSpaceWidth: number
  /** When set, emoji characters use this width in the estimation fallback */
  approxEmojiWidth?: number
  /** Applied to all input text before measuring/wrapping */
  parseText?: (text: string) => string
  /** When true, wrapText handles <br> tags (replace with space, or split lines) */
  normalizeLineBreakTags?: boolean
  fontFamily?: string
}

export interface TextMeasurer<V extends string = never> {
  measureTextWidth: (text: string, variant?: V | 'default') => number
  wrapText: (
    text: string,
    maxWidth: number,
    variant?: V | 'default',
    respectLineBreakTags?: boolean
  ) => string[]
}

// One canvas context is lazily created and shared by all measurers —
// only the `font` property changes between measurements.
let canvasContext: CanvasRenderingContext2D | null = null

const getCanvasContext = (): CanvasRenderingContext2D | null => {
  if (canvasContext) return canvasContext
  if (typeof document === 'undefined') return null
  try {
    const canvas = document.createElement('canvas')
    canvasContext = canvas.getContext('2d')
    return canvasContext
  } catch (error) {
    logger.warn('Failed to create canvas context for text measurement:', error)
    return null
  }
}

/**
 * Detects if a character code point is likely an emoji.
 * Covers common emoji ranges used in the trees.
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

export const createTextMeasurer = <V extends string = never>(
  config: TextMeasurerConfig<V>
): TextMeasurer<V> => {
  const {
    variants,
    approxSpaceWidth,
    approxEmojiWidth,
    parseText,
    normalizeLineBreakTags = false,
    fontFamily = DEFAULT_FONT_FAMILY,
  } = config

  /**
   * Measures the pixel width of text using Canvas API.
   * Returns null when Canvas is not available (e.g. in SSR).
   */
  const measureByCanvas = (text: string, variant: V | 'default'): number | null => {
    const ctx = getCanvasContext()
    if (!ctx) return null

    const font = variants[variant]
    ctx.font = `${font.weight} ${font.sizePx}px ${fontFamily}`

    try {
      return ctx.measureText(text).width
    } catch (error) {
      logger.warn('Failed to measure text:', error)
      return null
    }
  }

  /**
   * Estimates text width using character-based calculation.
   * Used as fallback when Canvas is not available (e.g. in SSR).
   */
  const estimateTextWidth = (text: string, variant: V | 'default'): number => {
    const { base, uppercase } = variants[variant].approxCharWidths

    let width = 0
    for (const char of text) {
      const codePoint = char.codePointAt(0) || 0

      if (char === ' ') {
        width += approxSpaceWidth
      } else if (approxEmojiWidth !== undefined && isEmoji(codePoint)) {
        width += approxEmojiWidth
      } else if (/[A-Z]/.test(char)) {
        width += uppercase
      } else {
        width += base
      }
    }
    return width
  }

  /**
   * Wraps text into multiple lines based on available width using Canvas measurements.
   * This ensures accurate word wrapping that matches actual rendered text.
   */
  const wrapByCanvas = (text: string, maxWidth: number, variant: V | 'default'): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i]
      const testWidth = measureByCanvas(testLine, variant)

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

  /**
   * Wraps text using character-based estimation.
   * Used as fallback when Canvas is not available (e.g. in SSR).
   */
  const estimateTextWrapping = (
    text: string,
    maxWidth: number,
    variant: V | 'default'
  ): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i]
      const testWidth = estimateTextWidth(testLine, variant)

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

  const wrapSegment = (segment: string, maxWidth: number, variant: V | 'default'): string[] => {
    return getCanvasContext()
      ? wrapByCanvas(segment, maxWidth, variant)
      : estimateTextWrapping(segment, maxWidth, variant)
  }

  /**
   * Measures text width using hybrid approach:
   * - Canvas API when available (browser)
   * - Estimation when Canvas unavailable (SSR)
   */
  const measureTextWidth = (text: string, variant: V | 'default' = 'default'): number => {
    const parsedText = parseText ? parseText(text) : text
    const canvasWidth = measureByCanvas(parsedText, variant)
    return canvasWidth !== null ? canvasWidth : estimateTextWidth(parsedText, variant)
  }

  /**
   * Wraps text into multiple lines using hybrid approach:
   * - Canvas API when available (browser)
   * - Estimation when Canvas unavailable (SSR)
   */
  const wrapText = (
    text: string,
    maxWidth: number,
    variant: V | 'default' = 'default',
    respectLineBreakTags = false
  ): string[] => {
    const parsedText = parseText ? parseText(text) : text

    if (!normalizeLineBreakTags) {
      return wrapSegment(parsedText, maxWidth, variant)
    }

    if (respectLineBreakTags) {
      const segments = parsedText.split(/<br\s*\/?>/i)

      return segments.flatMap((segment) => {
        // Empty segments become empty lines (preserving blank lines from consecutive <br>s)
        if (segment.trim() === '') {
          return ['']
        }
        return wrapSegment(segment, maxWidth, variant)
      })
    }

    // Replace all <br> with spaces and collapse whitespace
    const processedText = parsedText.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ')
    return wrapSegment(processedText, maxWidth, variant)
  }

  return { measureTextWidth, wrapText }
}
