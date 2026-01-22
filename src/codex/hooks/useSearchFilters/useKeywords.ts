import { useDeferredValue, useState, useEffect } from 'react'

import { isArrayEqual } from '@/shared/utils/lists'

interface UseKeywords {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  resetParsedKeywords: () => void
}

/**
 * Hook for managing keyword search with parsing and debouncing via React's useDeferredValue.
 *
 * - `keywords` updates immediately when the user types (for responsive UI)
 * - `deferredKeywords` updates with a slight delay (for expensive parsing/filtering)
 * - Keywords are parsed into an array using commas and "or" as separators
 * - This prevents expensive computations on every keystroke while keeping the UI responsive
 */
export const useKeywords = (defaultValue: string | undefined): UseKeywords => {
  const [keywords, setKeywords] = useState(defaultValue || '')
  const deferredKeywords = useDeferredValue(keywords)
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])

  useEffect(() => {
    const parsed = parseKeywords(deferredKeywords)
    if (!isArrayEqual(parsedKeywords, parsed)) {
      setParsedKeywords(parsed)
    }
  }, [deferredKeywords, parsedKeywords])

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
