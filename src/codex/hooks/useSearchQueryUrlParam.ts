import { useCallback, useEffect, useRef } from 'react'

import { useRouter } from 'next/router'

interface UseSearchQueryUrlParamOptions {
  keywords: string
  setKeywords: (keywords: string) => void
  resetFilters: () => void
  /** Cardex only: `?weekly` was present on arrival, so the challenge preset should be applied. */
  onWeeklyParam?: () => void
}

interface UseSearchQueryUrlParam {
  /** Cardex only: puts `?weekly` in the URL when the user clicks the Weekly Challenge button. */
  setWeeklyChallengeParam: () => void
}

export const SEARCH_QUERY_PARAM = 'query'
export const WEEKLY_CHALLENGE_PARAM = 'weekly'

const DEBOUNCE_MS = 500

/**
 * Two-way binding between the search field and `?query=` on Cardex and Skilldex.
 *
 * - Reads the param **once** on arrival, and resets every other filter so a shared link overwrites the cached one.
 * - Writes the search back to the URL as the user types, debounced
 *
 * Cardex also accepts `?weekly`, which applies the Weekly Challenge preset. Clicking the button
 * puts `?weekly` in the URL, giving an evergreen link that always resolves to the current
 * challenge. Arriving on `?weekly` deliberately does *not* keep the param: the preset sets the
 * search field, and that is written back as an ordinary `?query=` like any other search.
 */
export function useSearchQueryUrlParam({
  keywords,
  setKeywords,
  resetFilters,
  onWeeklyParam,
}: UseSearchQueryUrlParamOptions): UseSearchQueryUrlParam {
  const router = useRouter()
  const queryParam = router.query[SEARCH_QUERY_PARAM]
  const hasWeeklyParam = WEEKLY_CHALLENGE_PARAM in router.query
  const pathname = router.pathname
  const isRouterReady = router.isReady

  // Reading the router through a ref keeps it out of the effect dependencies.
  // NB: Never use whole router object in dependencies!
  const routerRef = useRef(router)
  routerRef.current = router

  // Callers recreate these every render, so a ref keeps them out of the read effect's deps and
  // stops an unstable identity from re-running a one-shot effect.
  const handlersRef = useRef({ setKeywords, resetFilters, onWeeklyParam })
  handlersRef.current = { setKeywords, resetFilters, onWeeklyParam }

  const hasReadParamRef = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldSkipNextWriteRef = useRef(false)

  const setWeeklyChallengeParam = useCallback(() => {
    shouldSkipNextWriteRef.current = true

    const nextQuery = { ...routerRef.current.query }

    delete nextQuery[SEARCH_QUERY_PARAM]
    nextQuery[WEEKLY_CHALLENGE_PARAM] = ''

    routerRef.current.replace({ pathname, query: nextQuery }, undefined, { shallow: true })
  }, [pathname])

  // Arriving with `?query=` or `?weekly` resets the visitor's cached filters.
  // Without a param nothing is touched, so a bare visit still restores its cache.
  useEffect(() => {
    if (!isRouterReady || hasReadParamRef.current) return

    hasReadParamRef.current = true

    const paramValue = typeof queryParam === 'string' ? queryParam.trim() : ''

    // `?query=` wins if both are somehow present: it is the more specific request.
    if (paramValue) {
      handlersRef.current.resetFilters()
      handlersRef.current.setKeywords(paramValue)
      return
    }

    // The preset cannot be applied yet — the challenge data is still being fetched. This only
    // signals intent; whoever owns the preset applies it once the data lands.
    if (hasWeeklyParam) handlersRef.current.onWeeklyParam?.()
  }, [isRouterReady, queryParam, hasWeeklyParam])

  useEffect(() => {
    if (!isRouterReady || !hasReadParamRef.current) return

    if (shouldSkipNextWriteRef.current) {
      shouldSkipNextWriteRef.current = false
      return
    }

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)

    debounceTimeoutRef.current = setTimeout(() => {
      const trimmedKeywords = keywords.trim()
      const nextQuery = { ...routerRef.current.query }

      // A search in the field replaces the preset link: the two describe different things, and
      // whatever is in the field is the more accurate description of what is on screen.
      delete nextQuery[WEEKLY_CHALLENGE_PARAM]

      if (trimmedKeywords) nextQuery[SEARCH_QUERY_PARAM] = keywords
      else delete nextQuery[SEARCH_QUERY_PARAM]

      routerRef.current.replace({ pathname, query: nextQuery }, undefined, { shallow: true })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    }
  }, [isRouterReady, keywords, pathname])

  return { setWeeklyChallengeParam }
}
