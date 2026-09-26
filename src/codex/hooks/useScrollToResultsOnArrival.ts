import { RefObject, useEffect, useRef } from 'react'

import { useRouter } from 'next/router'

import { MEDIA_QUERY_MOBILE } from '@/shared/hooks/useBreakpoint'

import { SEARCH_QUERY_PARAM } from './useCodexUrlParams'

/**
 * Arriving with `?query` on mobile, where the results panel stacks below the search panel.
 */
export function useScrollToResultsOnArrival(ref: RefObject<HTMLElement>, hasResults: boolean) {
  const router = useRouter()
  const hasCheckedRef = useRef(false)
  const isScrollPendingRef = useRef(false)

  useEffect(() => {
    if (!router.isReady) return

    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true

      const query = router.query[SEARCH_QUERY_PARAM]
      const keywords = Array.isArray(query) ? query[0] : query

      isScrollPendingRef.current =
        !!keywords?.trim() && window.matchMedia(MEDIA_QUERY_MOBILE).matches
    }

    if (!isScrollPendingRef.current || !hasResults) return
    isScrollPendingRef.current = false

    // Wait a frame so the panels have laid out before measuring.
    requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    )
  }, [router.isReady, router.query, hasResults, ref])
}
