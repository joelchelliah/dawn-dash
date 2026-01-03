// Wraps text into multiple lines based on available width
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

// Counts characters for line width calculation (default implementation)
// excluding HTML tags
const countRelevantCharactersForLineWidth = (str: string): number => {
  // Strip HTML tags
  const effectiveStr = str.replace(/<\/?(?:b|nobr)>/gi, '')
  return effectiveStr.length
}

// Truncates a line of text by replacing the last N characters with an ellipsis
export const truncateLine = (line: string, numCharsToReplace = 3): string => {
  if (line.length <= numCharsToReplace) {
    return '...'
  }
  return line.slice(0, -numCharsToReplace) + '...'
}
