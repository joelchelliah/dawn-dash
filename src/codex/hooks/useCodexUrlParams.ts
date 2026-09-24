import { useCallback, useEffect, useRef } from 'react'

import { NextRouter, useRouter } from 'next/router'

import { FilterUrlCodec } from '@/codex/utils/filterUrlCodec'

export interface UrlFilterBinding {
  codec: FilterUrlCodec
  filters: Record<string, boolean>
  /** Must be a tracked setter, or a filter applied from the URL never reaches the filter cache. */
  enableFilters: (keys: string[]) => void
}

interface UseCodexUrlParamsOptions {
  keywords: string
  setKeywords: (keywords: string) => void
  filterBindings: UrlFilterBinding[]
  resetFilters: () => void
  onWeeklyParam?: () => void
}

interface UseCodexUrlParams {
  setWeeklyChallengeParam: () => void
}

export const SEARCH_QUERY_PARAM = 'query'
export const WEEKLY_CHALLENGE_PARAM = 'weekly'

const DEBOUNCE_MS = 500

type Query = NextRouter['query']
/** `undefined` removes the param. */
type ParamUpdates = Record<string, string | undefined>

const getParamValue = (query: Query, param: string): string | undefined => {
  const value = query[param]
  return Array.isArray(value) ? value[0] : value
}

// Returns a copy of the query with the given changes
const withParams = (query: Query, updates: ParamUpdates): Query => {
  const nextQuery = { ...query }

  Object.entries(updates).forEach(([param, value]) => {
    if (value === undefined) delete nextQuery[param]
    else nextQuery[param] = value
  })

  return nextQuery
}

const isSameQuery = (a: Query, b: Query) => {
  const aKeys = Object.keys(a)

  return (
    aKeys.length === Object.keys(b).length &&
    aKeys.every((key) => String(a[key]) === String(b[key]))
  )
}

const replaceQuery = (router: NextRouter, query: Query) =>
  router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })

const encodeFilterParams = (bindings: UrlFilterBinding[]): ParamUpdates =>
  Object.fromEntries(bindings.map(({ codec, filters }) => [codec.param, codec.encode(filters)]))

/**
 * Explicit params win over `?weekly` if both are somehow present.
 * Without any codex param nothing is touched.
 */
const applyParamsOnArrival = (
  query: Query,
  { setKeywords, resetFilters, onWeeklyParam, filterBindings }: UseCodexUrlParamsOptions
) => {
  const keywords = getParamValue(query, SEARCH_QUERY_PARAM)?.trim()
  const presentBindings = filterBindings.filter(({ codec }) => codec.param in query)

  if (keywords || presentBindings.length > 0) {
    resetFilters()
    if (keywords) setKeywords(keywords)

    presentBindings.forEach(({ codec, enableFilters }) => {
      const keys = codec.decode(getParamValue(query, codec.param) ?? '')
      if (keys) enableFilters(keys)
    })
    return
  }

  // Only signals intent: the preset is applied by its owner once the challenge data lands
  if (WEEKLY_CHALLENGE_PARAM in query) onWeeklyParam?.()
}

/** Callers recreate their handlers every render; a ref keeps them out of effect deps. */
const useLatestRef = <T>(value: T) => {
  const ref = useRef(value)
  ref.current = value
  return ref
}

/**
 * Two-way binding between the search field + filter checkboxes and the URL, on Cardex and Skilldex.
 */
export function useCodexUrlParams(options: UseCodexUrlParamsOptions): UseCodexUrlParams {
  const { keywords, filterBindings } = options
  const router = useRouter()
  const isRouterReady = router.isReady

  // NB: Never use whole router object in dependencies!
  const routerRef = useLatestRef(router)
  const optionsRef = useLatestRef(options)

  const filterParams = encodeFilterParams(filterBindings)
  const filterParamsRef = useLatestRef(filterParams)
  const filterParamsKey = JSON.stringify(filterParams)

  const hasReadParamsRef = useRef(false)
  const shouldSkipNextWriteRef = useRef(false)

  const setWeeklyChallengeParam = useCallback(() => {
    // The preset's state changes run the write effect within this same click, since React
    // flushes effects synchronously for discrete events. Clearing afterwards stops the flag from
    // lingering when the preset changes nothing, where it would swallow the user's next edit.
    shouldSkipNextWriteRef.current = true
    setTimeout(() => {
      shouldSkipNextWriteRef.current = false
    }, 0)

    // `?weekly` stands alone: the filters it produces are what it means
    const clearedFilterParams = Object.fromEntries(
      optionsRef.current.filterBindings.map(({ codec }) => [codec.param, undefined])
    )

    replaceQuery(
      routerRef.current,
      withParams(routerRef.current.query, {
        [SEARCH_QUERY_PARAM]: undefined,
        ...clearedFilterParams,
        [WEEKLY_CHALLENGE_PARAM]: '',
      })
    )
  }, [optionsRef, routerRef])

  useEffect(() => {
    if (!isRouterReady || hasReadParamsRef.current) return

    hasReadParamsRef.current = true
    applyParamsOnArrival(routerRef.current.query, optionsRef.current)
  }, [isRouterReady, optionsRef, routerRef])

  useEffect(() => {
    if (!isRouterReady || !hasReadParamsRef.current) return

    if (shouldSkipNextWriteRef.current) {
      shouldSkipNextWriteRef.current = false
      return
    }

    const timeout = setTimeout(() => {
      const currentQuery = routerRef.current.query
      // Drops `?weekly`: once edited, the filters are the accurate description of the screen
      const nextQuery = withParams(currentQuery, {
        [WEEKLY_CHALLENGE_PARAM]: undefined,
        [SEARCH_QUERY_PARAM]: keywords.trim() ? keywords : undefined,
        ...filterParamsRef.current,
      })

      if (!isSameQuery(currentQuery, nextQuery)) replaceQuery(routerRef.current, nextQuery)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [isRouterReady, keywords, filterParamsKey, filterParamsRef, routerRef])

  return { setWeeklyChallengeParam }
}
