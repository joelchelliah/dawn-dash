import { useCallback, useEffect, useRef, useState } from 'react'

import { flushSync } from 'react-dom'

import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  cacheEventCodexSearchFilters,
  getCachedEventCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'
import { ZoomLevel } from '@/codex/constants/zoomValues'
import {
  LoopingPathMode,
  TreeNavigationMode,
  LevelOfDetail,
} from '@/codex/constants/eventSearchValues'

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
  levelOfDetail: LevelOfDetail
  setLevelOfDetail: (level: LevelOfDetail) => void
  showContinuesTags: boolean
  setShowContinuesTags: (show: boolean) => void
  resetFilters: (callback?: () => void) => void
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
  const [levelOfDetail, setLevelOfDetailUntracked] = useState<LevelOfDetail>(LevelOfDetail.BALANCED)
  const [showContinuesTags, setShowContinuesTagsUntracked] = useState<boolean>(true)

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
    if (isNotNullOrUndefined(cachedFilters?.levelOfDetail)) {
      setLevelOfDetailUntracked(cachedFilters.levelOfDetail as LevelOfDetail)
    }
    if (isNotNullOrUndefined(cachedFilters?.showContinuesTags)) {
      setShowContinuesTagsUntracked(cachedFilters.showContinuesTags)
    }
  }, [])

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedSetter } = useFilterTracking()

  const trackedSetShowAdvancedOptions = createTrackedSetter(setShowAdvancedOptionsUntracked)
  const trackedSetLoopingPathMode = createTrackedSetter(setLoopingPathModeUntracked)
  const trackedSetNavigationMode = createTrackedSetter(setNavigationModeUntracked)
  const trackedSetLevelOfDetail = createTrackedSetter(setLevelOfDetailUntracked)
  const trackedSetShowContinuesTags = createTrackedSetter(setShowContinuesTagsUntracked)

  // --------------------------------------------------
  // ------------- Reset functionality ----------------
  // --------------------------------------------------
  const resetFilters = useCallback(
    (callback?: () => void) => {
      flushSync(() => {
        setZoomLevel(ZoomLevel.COVER)
        setFilterText('')
        trackedSetShowAdvancedOptions(false)
        trackedSetLoopingPathMode(LoopingPathMode.LINK)
        trackedSetNavigationMode(TreeNavigationMode.DRAG)
        trackedSetLevelOfDetail(LevelOfDetail.BALANCED)
        trackedSetShowContinuesTags(true)
      })
      // Clear any pending debounced cache write
      // and immediately save to cache (don't wait for debounced effect)
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
        filterDebounceTimeoutRef.current = null
      }
      cacheEventCodexSearchFilters({
        showAdvancedOptions: false,
        loopingPathMode: LoopingPathMode.LINK,
        navigationMode: TreeNavigationMode.DRAG,
        levelOfDetail: LevelOfDetail.BALANCED,
        showContinuesTags: true,
        lastUpdated: Date.now(),
      })
      if (callback) {
        callback()
      }
    },
    [
      setFilterText,
      trackedSetShowAdvancedOptions,
      trackedSetLoopingPathMode,
      trackedSetNavigationMode,
      trackedSetLevelOfDetail,
      trackedSetShowContinuesTags,
    ]
  )

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
        levelOfDetail,
        showContinuesTags,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [
    loopingPathMode,
    showAdvancedOptions,
    navigationMode,
    levelOfDetail,
    showContinuesTags,
    hasUserChangedFilter,
  ])

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
    levelOfDetail,
    setLevelOfDetail: trackedSetLevelOfDetail,
    showContinuesTags,
    setShowContinuesTags: trackedSetShowContinuesTags,
    resetFilters,
  }
}
