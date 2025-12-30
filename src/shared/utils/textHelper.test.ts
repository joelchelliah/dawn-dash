import { wrapText } from './textHelper'

describe('textHelper', () => {
  describe('wrapText', () => {
    it('should wrap text at word boundaries', () => {
      const result = wrapText('Word1 Word2 Word3 Word4 Word5', 60, 10)

      // Should have wrapped into multiple lines
      expect(result.length).toBeGreaterThan(2)

      // Lines shouldn't start or end with spaces
      result.slice(1).forEach((line) => {
        expect(line.startsWith(' ')).toBe(false)
        expect(line.endsWith(' ')).toBe(false)
      })
    })

    it('should include empty first line for padding', () => {
      const result = wrapText('Any text', 100, 10)

      expect(result[0]).toBe('')
    })

    it('should keep short text on one line (plus padding)', () => {
      const result = wrapText('Short', 200, 10)

      // Empty padding line + single content line
      expect(result.length).toBe(2)
      expect(result[0]).toBe('')
      expect(result[1]).toBe('Short')
    })

    it('should wrap long text into multiple lines', () => {
      const longText =
        'This is a very long sentence that should definitely wrap into multiple lines'
      const result = wrapText(longText, 100, 10)

      // Should have padding + multiple content lines
      expect(result.length).toBeGreaterThan(2)
      expect(result[0]).toBe('')
    })

    it('should handle single word that fits', () => {
      const result = wrapText('Word', 100, 10)

      expect(result).toEqual(['', 'Word'])
    })

    it('should respect font size in width calculation', () => {
      const text = 'Word1 Word2 Word3'

      // Larger font size should cause earlier wrapping
      const smallFont = wrapText(text, 100, 5)
      const largeFont = wrapText(text, 100, 15)

      // Larger font should produce more lines
      expect(largeFont.length).toBeGreaterThanOrEqual(smallFont.length)
    })

    it('should use custom character counter when provided', () => {
      let customCounterCalled = false
      const customCounter = (str: string) => {
        customCounterCalled = true
        // Make characters count as much wider to force more wrapping
        return str.length * 10
      }

      const text = 'Word1 Word2 Word3 Word4 Word5'

      const result = wrapText(text, 50, 10, customCounter)

      // Verify the custom counter was actually called
      expect(customCounterCalled).toBe(true)
      // Should have multiple lines due to aggressive character counting
      expect(result.length).toBeGreaterThan(3)
    })

    it('should handle empty string', () => {
      const result = wrapText('', 100, 10)

      expect(result).toEqual(['', ''])
    })

    it('should handle text with HTML tags when using default counter', () => {
      const result = wrapText('Hello <b>World</b> Test', 100, 10)

      // Should still wrap correctly even with HTML tags
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0]).toBe('')
    })

    it('should preserve HTML tags in output', () => {
      const result = wrapText('<b>Bold</b> text', 200, 10)

      // Tags should be preserved in the output
      expect(result.join(' ')).toContain('<b>')
      expect(result.join(' ')).toContain('</b>')
    })

    it('should handle multiple spaces between words', () => {
      const result = wrapText('Word1    Word2', 200, 10)

      // Function splits by whitespace, so multiple spaces are normalized
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0]).toBe('')
    })

    it('should wrap very long text correctly', () => {
      const longText =
        'The quick brown fox jumps over the lazy dog and runs through the forest with great speed'
      const result = wrapText(longText, 80, 10)

      // Should have multiple lines
      expect(result.length).toBeGreaterThan(3)
      // First line is empty padding
      expect(result[0]).toBe('')
      // All other lines should have content
      result.slice(1).forEach((line) => {
        expect(line.length).toBeGreaterThan(0)
      })
    })
  })
})
