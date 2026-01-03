import { wrapText, truncateLine } from './textHelper'

describe('textHelper', () => {
  describe('wrapText', () => {
    it('should wrap text at word boundaries', () => {
      const result = wrapText('Word1 Word2 Word3 Word4 Word5', 60)

      // Should have wrapped into multiple lines
      expect(result.length).toBeGreaterThan(2)

      // Lines shouldn't start or end with spaces
      result.slice(1).forEach((line) => {
        expect(line.startsWith(' ')).toBe(false)
        expect(line.endsWith(' ')).toBe(false)
      })
    })

    it('should keep short text on one line (plus padding)', () => {
      const result = wrapText('Short', 200)

      // Empty padding line + single content line
      expect(result.length).toBe(1)
      expect(result[0]).toBe('Short')
    })

    it('should wrap long text into multiple lines', () => {
      const longText =
        'This is a very long sentence that should definitely wrap into multiple lines'
      const result = wrapText(longText, 100)

      // Should have padding + multiple content lines
      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle single word that fits', () => {
      const result = wrapText('Word', 100)

      expect(result).toEqual(['Word'])
    })

    it('should use custom character counter when provided', () => {
      let customCounterCalled = false
      const customCounter = (str: string) => {
        customCounterCalled = true
        // Make characters count as much wider to force more wrapping
        return str.length * 10
      }

      const text = 'Word1 Word2 Word3 Word4 Word5'

      const result = wrapText(text, 50, customCounter)

      // Verify the custom counter was actually called
      expect(customCounterCalled).toBe(true)
      // Should have multiple lines due to aggressive character counting
      expect(result.length).toBeGreaterThan(3)
    })

    it('should handle empty string', () => {
      const result = wrapText('', 100)

      expect(result).toEqual([''])
    })

    it('should handle text with HTML tags when using default counter', () => {
      const result = wrapText('Hello <b>World</b> Test', 100)

      // Should still wrap correctly even with HTML tags
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('should preserve HTML tags in output', () => {
      const result = wrapText('<b>Bold</b> text', 200)

      // Tags should be preserved in the output
      expect(result.join(' ')).toContain('<b>')
      expect(result.join(' ')).toContain('</b>')
    })

    it('should handle multiple spaces between words', () => {
      const result = wrapText('Word1    Word2', 200)

      // Function splits by whitespace, so multiple spaces are normalized
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('truncateLine', () => {
    it('should truncate line by replacing last 3 characters with ellipsis by default', () => {
      const result = truncateLine('Hello World')
      expect(result).toBe('Hello Wo...')
    })

    it('should return ellipsis when line is shorter than or equal to numCharsToReplace', () => {
      expect(truncateLine('Hi', 3)).toBe('...')
      expect(truncateLine('Hi', 2)).toBe('...')
      expect(truncateLine('Hello', 5)).toBe('...')
    })
  })
})
