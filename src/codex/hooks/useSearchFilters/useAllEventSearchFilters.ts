import { useCallback, useEffect, useRef, useState } from 'react'

import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  cacheEventCodexSearchFilters,
  getCachedEventCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'
import { LoopingPathMode, TreeNavigationMode, ZoomLevel } from '@/codex/constants/eventSearchValues'

import { useFilterTracking } from './useFilterTracking'
import { useEventFilterText } from './useEventFilterText'

export interface UseAllEventSearchFilters {
  zoomLevel: ZoomLevel
  setZoomLevel: (zoom: ZoomLevel) => void
  filterText: string
  setFilterText: (text: string) => void
  deferredFilterText: string
  showAdvancedOptions: boolean
  setShowAdvancedOptions: (show: boolean) => void
  loopingPathMode: LoopingPathMode
  setLoopingPathMode: (mode: LoopingPathMode) => void
  navigationMode: TreeNavigationMode
  setNavigationMode: (mode: TreeNavigationMode) => void
  resetFilters: () => void
}

export const useAllEventSearchFilters = (): UseAllEventSearchFilters => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.COVER)
  const { filterText, setFilterText, deferredFilterText } = useEventFilterText()
  const [showAdvancedOptions, setShowAdvancedOptionsUntracked] = useState<boolean>(false)
  const [loopingPathMode, setLoopingPathModeUntracked] = useState<LoopingPathMode>(
    LoopingPathMode.LINK
  )
  const [navigationMode, setNavigationModeUntracked] = useState<TreeNavigationMode>(
    TreeNavigationMode.DRAG
  )

  // Load from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    const cachedFilters = getCachedEventCodexSearchFilters()
    if (isNotNullOrUndefined(cachedFilters?.showAdvancedOptions)) {
      setShowAdvancedOptionsUntracked(cachedFilters.showAdvancedOptions)
    }
    if (isNotNullOrUndefined(cachedFilters?.loopingPathMode)) {
      setLoopingPathModeUntracked(cachedFilters.loopingPathMode as LoopingPathMode)
    }
    if (isNotNullOrUndefined(cachedFilters?.navigationMode)) {
      setNavigationModeUntracked(cachedFilters.navigationMode as TreeNavigationMode)
    }
  }, [])

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedSetter } = useFilterTracking()

  const trackedSetShowAdvancedOptions = createTrackedSetter(setShowAdvancedOptionsUntracked)
  const trackedSetLoopingPathMode = createTrackedSetter(setLoopingPathModeUntracked)
  const trackedSetNavigationMode = createTrackedSetter(setNavigationModeUntracked)

  // --------------------------------------------------
  // ------------- Reset functionality ----------------
  // --------------------------------------------------
  const resetFilters = useCallback(() => {
    setZoomLevel(ZoomLevel.COVER)
    setFilterText('')
    trackedSetShowAdvancedOptions(false)
    trackedSetLoopingPathMode(LoopingPathMode.LINK)
    trackedSetNavigationMode(TreeNavigationMode.DRAG)
  }, [
    setFilterText,
    trackedSetShowAdvancedOptions,
    trackedSetLoopingPathMode,
    trackedSetNavigationMode,
  ])

  // --------------------------------------------------
  // -------- Debounced caching of filters ------------
  // --------------------------------------------------
  const filterDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!hasUserChangedFilter.current) return

    if (filterDebounceTimeoutRef.current) {
      clearTimeout(filterDebounceTimeoutRef.current)
    }

    filterDebounceTimeoutRef.current = setTimeout(() => {
      cacheEventCodexSearchFilters({
        showAdvancedOptions,
        loopingPathMode,
        navigationMode,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [loopingPathMode, showAdvancedOptions, navigationMode, hasUserChangedFilter])

  // --------------------------------------------------
  // --------------------------------------------------

  return {
    filterText,
    setFilterText,
    deferredFilterText,
    zoomLevel,
    setZoomLevel,
    showAdvancedOptions,
    setShowAdvancedOptions: trackedSetShowAdvancedOptions,
    loopingPathMode,
    setLoopingPathMode: trackedSetLoopingPathMode,
    navigationMode,
    setNavigationMode: trackedSetNavigationMode,
    resetFilters,
  }
}
