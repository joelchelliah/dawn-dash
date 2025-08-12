import { useDeferredValue, useState, useEffect } from 'react'

import { isArrayEqual } from '../../../shared/utils/lists'

interface UseKeywords {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  resetParsedKeywords: () => void
}

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
