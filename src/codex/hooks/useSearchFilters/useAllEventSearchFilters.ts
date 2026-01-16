import { useCallback, useEffect, useRef, useState } from 'react'

import {
  cacheEventCodexSearchFilters,
  getCachedEventCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'
import { LoopingPathMode, ZoomLevel } from '@/codex/constants/eventSearchValues'

import { useFilterTracking } from './useFilterTracking'
import { useEventFilterText } from './useEventFilterText'

export interface UseAllEventSearchFilters {
  zoomLevel: ZoomLevel
  setZoomLevel: (zoom: ZoomLevel) => void
  filterText: string
  setFilterText: (text: string) => void
  deferredFilterText: string
  loopingPathMode: LoopingPathMode
  setLoopingPathMode: (mode: LoopingPathMode) => void
  resetFilters: () => void
}

export const useAllEventSearchFilters = (): UseAllEventSearchFilters => {
  const cachedFilters = getCachedEventCodexSearchFilters()

  const { filterText, setFilterText, deferredFilterText } = useEventFilterText()
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.COVER)
  const [loopingPathMode, setLoopingPathModeUntracked] = useState<LoopingPathMode>(
    (cachedFilters?.loopingPathMode as LoopingPathMode) ?? LoopingPathMode.INDICATOR
  )

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedSetter } = useFilterTracking()

  const trackedSetLoopingPathMode = createTrackedSetter(setLoopingPathModeUntracked)

  // --------------------------------------------------
  // ------------- Reset functionality ----------------
  // --------------------------------------------------
  const resetFilters = useCallback(() => {
    setFilterText('')
    setZoomLevel(ZoomLevel.COVER)
    trackedSetLoopingPathMode(LoopingPathMode.INDICATOR)
  }, [setFilterText, trackedSetLoopingPathMode])

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
        loopingPathMode,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [loopingPathMode, hasUserChangedFilter])

  // --------------------------------------------------
  // --------------------------------------------------

  return {
    filterText,
    setFilterText,
    deferredFilterText,
    zoomLevel,
    setZoomLevel,
    loopingPathMode,
    setLoopingPathMode: trackedSetLoopingPathMode,
    resetFilters,
  }
}
