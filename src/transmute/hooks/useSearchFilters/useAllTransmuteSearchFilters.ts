import { useEffect, useRef, useState } from 'react'

import { useTransmuteCardSetFilters } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import { useFilterTracking } from '@/shared/hooks/useSearchFilters/useFilterTracking'

import { TransmuteMode } from '@/transmute/types/rules'
import {
  ALL_DIRECTIONS,
  ALL_MODES,
  DEFAULT_DIRECTION,
  DEFAULT_MODE,
  TransmuteDirection,
} from '@/transmute/types/filters'
import {
  cacheTransmuteSearchFilters,
  getCachedTransmuteSearchFilters,
} from '@/transmute/utils/transmuteFilterStore'

import { useEnergyAttributeFilters } from './useEnergyAttributeFilters'
import { useFormattingTransmuteFilters } from './useFormattingTransmuteFilters'

export interface UseAllTransmuteSearchFilters {
  direction: TransmuteDirection
  setDirection: (direction: TransmuteDirection) => void
  mode: TransmuteMode
  setMode: (mode: TransmuteMode) => void
  useCardSetFilters: ReturnType<typeof useTransmuteCardSetFilters>
  useEnergyAttributeFilters: ReturnType<typeof useEnergyAttributeFilters>
  useFormattingFilters: ReturnType<typeof useFormattingTransmuteFilters>
  resetFilters: () => void
}

const pickValid = <T extends string>(value: unknown, valid: readonly T[], fallback: T): T =>
  valid.includes(value as T) ? (value as T) : fallback

export const useAllTransmuteSearchFilters = (): UseAllTransmuteSearchFilters => {
  const cachedFilters = getCachedTransmuteSearchFilters()

  const [direction, setDirectionUntracked] = useState<TransmuteDirection>(DEFAULT_DIRECTION)
  const [mode, setModeUntracked] = useState<TransmuteMode>(DEFAULT_MODE)

  /*
   * Applied after mount, not as the initial state: the server renders the defaults, and the mode
   * changes the panel's structure (energy attributes shown or hidden), so a cached value in the first
   * client render is a hydration error. Checkboxes get away with it via `Checkbox`'s `isHydrated`.
   */
  useEffect(() => {
    setDirectionUntracked(pickValid(cachedFilters?.direction, ALL_DIRECTIONS, DEFAULT_DIRECTION))
    setModeUntracked(pickValid(cachedFilters?.mode, ALL_MODES, DEFAULT_MODE))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only: the cache is re-read every render
  }, [])

  const untrackedUseCardSetFilters = useTransmuteCardSetFilters(cachedFilters?.cardSets)
  const untrackedUseEnergyAttributeFilters = useEnergyAttributeFilters(
    cachedFilters?.energyAttributes
  )
  const untrackedUseFormattingFilters = useFormattingTransmuteFilters(cachedFilters?.formatting)

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedFilter, createTrackedSetter } = useFilterTracking()

  const TRACKED_FILTER_HANDLERS = {
    cardSet: ['handleCardSetFilterToggle', 'enableCardSetFilters', 'resetCardSetFilters'] as const,
    energyAttribute: [
      'handleEnergyAttributeFilterToggle',
      'enableEnergyAttributeFilters',
      'resetEnergyAttributeFilters',
    ] as const,
    formatting: ['handleFormattingFilterToggle', 'resetFormattingFilters'] as const,
  } as const

  const trackedSetDirection = createTrackedSetter(setDirectionUntracked)
  const trackedSetMode = createTrackedSetter(setModeUntracked)

  const trackedUseCardSetFilters = createTrackedFilter(untrackedUseCardSetFilters, [
    ...TRACKED_FILTER_HANDLERS.cardSet,
  ])
  const trackedUseEnergyAttributeFilters = createTrackedFilter(untrackedUseEnergyAttributeFilters, [
    ...TRACKED_FILTER_HANDLERS.energyAttribute,
  ])
  const trackedUseFormattingFilters = createTrackedFilter(untrackedUseFormattingFilters, [
    ...TRACKED_FILTER_HANDLERS.formatting,
  ])
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, resetCardSetFilters } = trackedUseCardSetFilters
  const { energyAttributeFilters, resetEnergyAttributeFilters } = trackedUseEnergyAttributeFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters

  const resetFilters = () => {
    trackedSetDirection(DEFAULT_DIRECTION)
    trackedSetMode(DEFAULT_MODE)
    resetCardSetFilters()
    resetEnergyAttributeFilters()
    resetFormattingFilters()
  }

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
      cacheTransmuteSearchFilters({
        direction,
        mode,
        cardSets: cardSetFilters,
        energyAttributes: energyAttributeFilters,
        formatting: formattingFilters,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [
    direction,
    mode,
    cardSetFilters,
    energyAttributeFilters,
    formattingFilters,
    hasUserChangedFilter,
  ])

  return {
    direction,
    setDirection: trackedSetDirection,
    mode,
    setMode: trackedSetMode,
    useCardSetFilters: trackedUseCardSetFilters,
    useEnergyAttributeFilters: trackedUseEnergyAttributeFilters,
    useFormattingFilters: trackedUseFormattingFilters,
    resetFilters,
  }
}
