// Wraps text into multiple lines based on width and font size
export const wrapText = (
  text: string,
  width: number,
  fontSize: number,
  customCharCounter?: (str: string) => number
): string[] => {
  const approxCharacterWidth = fontSize * 0.61
  const words = text.split(' ')
  const lines: string[] = [''] // Start with an empty line for slight padding
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
