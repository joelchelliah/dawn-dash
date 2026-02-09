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
