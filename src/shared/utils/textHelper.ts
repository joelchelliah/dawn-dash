/**
 * Approximate character width in pixels for different font sizes.
 * These values are empirically derived to match the actual rendered font metrics
 * in the event tree SVG rendering.
 *
 * Font sizes:
 * - xxs: 0.75rem (12px at default browser font size)
 * - xs: 0.875rem (14px at default browser font size)
 */
const PIXELS_PER_CHARACTER = {
  xxs: 6.4,
  xxsUppercase: 8.2,
  xs: 8.6,
  xsUppercase: 10.4,
  space: 3,
}

/**
 * Estimates the pixel width needed to render the given text at the specified font size.
 * Uses per-character estimation that accounts for uppercase letters and spaces being
 * different widths than regular lowercase characters.
 */
export const estimateNeededWidthForTextInNode = (text: string, fontSize: 'xxs' | 'xs') => {
  const base = fontSize === 'xxs' ? PIXELS_PER_CHARACTER.xxs : PIXELS_PER_CHARACTER.xs
  const upper =
    fontSize === 'xxs' ? PIXELS_PER_CHARACTER.xxsUppercase : PIXELS_PER_CHARACTER.xsUppercase

  let width = 0
  for (const char of text) {
    if (char === ' ') {
      width += PIXELS_PER_CHARACTER.space
    } else if (/[A-Z]/.test(char)) {
      width += upper
    } else {
      width += base
    }
  }
  return width
}

/**
 * Wraps text into multiple lines based on available width and font size.
 * Uses word-based wrapping and shares the same character width estimation logic
 * as `estimateNeededWidthForTextInNode` to ensure consistency.
 */
export const wrapTextByFontSize = (text: string, maxWidth: number, fontSize: 'xxs' | 'xs') => {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i]
    const testWidth = estimateNeededWidthForTextInNode(testLine, fontSize) // Use shared function

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
 * Legacy text wrapping function with simpler character counting.
 * Kept for backward compatibility with existing code.
 *
 * @deprecated Consider using `wrapTextByFontSize` for more accurate results
 */
export const wrapText = (
  text: string,
  width: number,
  customCharCounter?: (str: string) => number
): string[] => {
  const fontSize = 12 // Corresponds to font-size('xxs')
  const approxCharacterWidth = fontSize * 0.61

  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  const charCounter = customCharCounter || countRelevantCharactersForLineWidth

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const testLine = currentLine + ' ' + word
    const testWidth = charCounter(testLine) * approxCharacterWidth

    if (testWidth > width) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine)
  return lines
}

/**
 * Counts relevant characters for line width calculation, excluding HTML tags.
 * Used by the legacy `wrapText` function.
 *
 * @param str - String to count characters in
 * @returns Character count excluding HTML tags
 */
const countRelevantCharactersForLineWidth = (str: string): number => {
  // Strip HTML tags
  const effectiveStr = str.replace(/<\/?(?:b|nobr)>/gi, '')
  return effectiveStr.length
}

/**
 * Truncates a line of text by replacing the last N characters with an ellipsis (...).
 *
 * @param line - The line to truncate
 * @param numCharsToReplace - Number of characters to replace with ellipsis (default: 3)
 * @returns Truncated line with ellipsis
 */
export const truncateLine = (line: string, numCharsToReplace = 3): string => {
  if (line.length <= numCharsToReplace) {
    return '...'
  }
  return line.slice(0, -numCharsToReplace) + '...'
}
