import { useState, useEffect, useRef } from 'react'

import { isArrayEqual } from '@/shared/utils/lists'

interface UseKeywords {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  resetParsedKeywords: () => void
}

const DEBOUNCE_MS = 150

/**
 * Hook for managing keyword search with parsing and debouncing.
 *
 * - `keywords` updates immediately when the user types (for responsive UI)
 * - `parsedKeywords` updates after a short debounce delay, preventing
 *   expensive downstream filtering from running on every keystroke and
 *   blocking the main thread
 * - Keywords are parsed into an array using commas and "or" as separators
 */
export const useKeywords = (defaultValue: string | undefined): UseKeywords => {
  const [keywords, setKeywords] = useState(defaultValue || '')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      const parsed = parseKeywords(keywords)
      if (!isArrayEqual(parsedKeywords, parsed)) {
        setParsedKeywords(parsed)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [keywords, parsedKeywords])

  return {
    keywords,
    setKeywords,
    parsedKeywords,
    resetParsedKeywords: () => setParsedKeywords([]),
  }
}

const parseKeywords = (keywords: string): string[] =>
  keywords
    .split(/,\s+or\s+|,\s*|\s+or\s+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean)
