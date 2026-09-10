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

/**
 * Inserts spaces at camelCase boundaries, so data-derived identifiers read as prose.
 *
 * @param text - The text to split, e.g. "BossTreasure"
 * @returns The text with spaces inserted, e.g. "Boss Treasure"
 */
export const splitCamelCaseWords = (text: string): string =>
  text.replace(/([a-z])([A-Z])/g, '$1 $2')
