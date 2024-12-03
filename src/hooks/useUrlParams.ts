import { useEffect, useRef, useCallback } from 'react'

import { useSearchParams } from 'react-router-dom'

import {
  DIFFICULTY_VALUES,
  PLAYER_LIMIT_VALUES,
  MAX_DURATION_SUNFORGE_VALUES,
  MAX_DURATION_OTHER_VALUES,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
} from '../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass } from '../types/speedRun'

function setSearchParamsFromControlState(
  setSearchParams: (params: URLSearchParams, options?: { replace?: boolean }) => void,
  selectedClass: SpeedRunClass,
  controls: ChartControlState,
  debounceTimeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>
) {
  const isSunforge = selectedClass === SpeedRunClass.Sunforge

  if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)

  debounceTimeoutRef.current = setTimeout(() => {
    const params = new URLSearchParams()
    params.set('class', selectedClass)
    if (!isSunforge) params.set('difficulty', controls.difficulty)
    params.set('players', controls.playerLimit.toString())
    params.set('duration', controls.maxDuration.toString())
    params.set('view', controls.viewMode)
    params.set('zoom', controls.zoomLevel.toString())

    setSearchParams(params, { replace: true })
  }, 100)
}

export function useUrlParams(selectedClass: SpeedRunClass, controls: ChartControlState): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const isSunforge = selectedClass === SpeedRunClass.Sunforge

  const prevControlStateRef = useRef(controls)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  // Validation helpers
  const isValidDifficulty = (value: string): value is Difficulty =>
    DIFFICULTY_VALUES.includes(value as Difficulty)

  const isValidPlayerLimit = (value: number): boolean => PLAYER_LIMIT_VALUES.includes(value)

  const isValidDuration = useCallback(
    (value: number): boolean =>
      isSunforge
        ? MAX_DURATION_SUNFORGE_VALUES.includes(value)
        : MAX_DURATION_OTHER_VALUES.includes(value),
    [isSunforge]
  )

  const isValidViewMode = (value: string): value is ViewMode =>
    VIEW_MODE_VALUES.includes(value as ViewMode)

  const isValidZoomLevel = (value: number): boolean => ZOOM_LEVEL_VALUES.includes(value)

  useEffect(() => {
    const currentTimeout = debounceTimeoutRef.current
    const isUpdateFromControlChange = Object.entries(
      controls as unknown as Record<string, unknown>
    ).some(([key, value]) => prevControlStateRef.current[key as keyof ChartControlState] !== value)

    prevControlStateRef.current = controls

    if (isUpdateFromControlChange) {
      // Update URL params if controls have changed
      setSearchParamsFromControlState(setSearchParams, selectedClass, controls, debounceTimeoutRef)
    } else {
      // Otherwise, update controls from URL params
      const difficulty = searchParams.get('difficulty')
      const players = searchParams.get('players')
      const duration = searchParams.get('duration')
      const view = searchParams.get('view')
      const zoom = searchParams.get('zoom')

      let areAllParamsValid = true

      if (difficulty && !isSunforge && isValidDifficulty(difficulty)) {
        controls.setDifficulty(difficulty)
      } else if (difficulty) {
        areAllParamsValid = false
      }

      if (players) {
        const playerValue = parseInt(players)
        if (isValidPlayerLimit(playerValue)) {
          controls.setPlayerLimit(playerValue)
        } else {
          areAllParamsValid = false
        }
      }

      if (duration) {
        const durationValue = parseInt(duration)
        if (isValidDuration(durationValue)) {
          controls.setMaxDuration(durationValue)
        } else {
          areAllParamsValid = false
        }
      }

      if (view && isValidViewMode(view)) {
        controls.setViewMode(view)
      } else if (view) {
        areAllParamsValid = false
      }

      if (zoom) {
        const zoomValue = parseInt(zoom)
        if (isValidZoomLevel(zoomValue)) {
          controls.setZoomLevel(zoomValue)
        } else {
          areAllParamsValid = false
        }
      }

      // If any parameter is invalid, reset URL to previous valid control state
      if (!areAllParamsValid) {
        setSearchParamsFromControlState(
          setSearchParams,
          selectedClass,
          controls,
          debounceTimeoutRef
        )
      }
    }

    return () => {
      if (currentTimeout) clearTimeout(currentTimeout)
    }
  }, [searchParams, controls, selectedClass, setSearchParams, isSunforge, isValidDuration])
}
