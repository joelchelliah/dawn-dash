import { useEffect, useRef } from 'react'

import { useRouter } from 'next/router'

interface UseSearchQueryUrlParamOptions {
  keywords: string
  setKeywords: (keywords: string) => void
  resetFilters: () => void
}

export const SEARCH_QUERY_PARAM = 'query'

const DEBOUNCE_MS = 500

/**
 * Two-way binding between the search field and `?query=` on Cardex and Skilldex.
 *
 * - Reads the param **once** on arrival, and resets every other filter so a shared link overwrites the cached one.
 * - Writes the search back to the URL as the user types, debounced
 */
export function useSearchQueryUrlParam({
  keywords,
  setKeywords,
  resetFilters,
}: UseSearchQueryUrlParamOptions): void {
  const router = useRouter()
  const queryParam = router.query[SEARCH_QUERY_PARAM]
  const pathname = router.pathname
  const isRouterReady = router.isReady

  // Reading the router through a ref keeps it out of the effect dependencies.
  // NB: Never use whole router object in dependencies!
  const routerRef = useRef(router)
  routerRef.current = router

  const hasReadParamRef = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Arriving with `?query=` resets the visitor's cached filters.
  // Without a param nothing is touched, so a bare visit still restores its cache.
  useEffect(() => {
    if (!isRouterReady || hasReadParamRef.current) return

    hasReadParamRef.current = true

    const paramValue = typeof queryParam === 'string' ? queryParam.trim() : ''
    if (!paramValue) return

    resetFilters()
    setKeywords(paramValue)
  }, [isRouterReady, queryParam, resetFilters, setKeywords])

  useEffect(() => {
    if (!isRouterReady || !hasReadParamRef.current) return

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)

    debounceTimeoutRef.current = setTimeout(() => {
      const trimmedKeywords = keywords.trim()
      const nextQuery = { ...routerRef.current.query }

      if (trimmedKeywords) nextQuery[SEARCH_QUERY_PARAM] = keywords
      else delete nextQuery[SEARCH_QUERY_PARAM]

      routerRef.current.replace({ pathname, query: nextQuery }, undefined, { shallow: true })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    }
  }, [isRouterReady, keywords, pathname])
}
