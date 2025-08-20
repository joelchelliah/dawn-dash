import { useEffect, useRef, useCallback } from 'react'

import { NextRouter, useRouter } from 'next/router'

import { CharacterClass } from '@/shared/types/characterClass'

import {
  DIFFICULTY_VALUES,
  PLAYER_LIMIT_VALUES,
  MAX_DURATION_SUNFORGE_VALUES,
  MAX_DURATION_OTHER_VALUES,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
  LAST_DAYS_VALUES,
  GAME_VERSION_VALUES,
} from '../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../types/chart'
import { Difficulty, SpeedRunSubclass } from '../types/speedRun'
import { submissionWindowFromUrlString, submissionWindowToUrlString } from '../utils/gameVersion'

function setSearchParamsFromControlState(
  router: NextRouter,
  selectedClass: CharacterClass,
  controls: ChartControlState,
  debounceTimeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>
) {
  const isSunforge = selectedClass === CharacterClass.Sunforge

  if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)

  debounceTimeoutRef.current = setTimeout(() => {
    router.replace({
      pathname: router.pathname,
      query: {
        class: selectedClass,
        subclass: isSunforge ? controls.subclass || SpeedRunSubclass.All : router.query.subclass,
        difficulty: isSunforge ? router.query.difficulty : controls.difficulty,
        players: controls.playerLimit.toString(),
        duration: controls.maxDuration.toString(),
        view: controls.viewMode,
        zoom: controls.zoomLevel.toString(),
        window: submissionWindowToUrlString(controls.submissionWindow),
      },
    })
  }, 100)
}

export function useUrlParams(
  selectedClass: CharacterClass,
  setSelectedClass: (classType: CharacterClass) => void,
  controls: ChartControlState
): void {
  const router = useRouter()
  const {
    class: classParam,
    subclass: subclassParam,
    difficulty,
    players,
    duration,
    view,
    zoom,
    window: submissionWindow,
  } = router.query

  const isSunforge = selectedClass === CharacterClass.Sunforge

  const prevClassRef = useRef(selectedClass)
  const prevControlStateRef = useRef(controls)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  const isValidClass = (value: string): value is CharacterClass =>
    Object.values(CharacterClass).includes(value as CharacterClass)

  const isValidSubclass = (value: string): value is SpeedRunSubclass =>
    Object.values(SpeedRunSubclass).includes(value as SpeedRunSubclass)

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

  const isValidSubmissionWindow = (value: string): boolean => {
    if (!value.includes('-')) return LAST_DAYS_VALUES.includes(value)

    const [min, max] = value.split('-')

    return GAME_VERSION_VALUES.includes(min) && GAME_VERSION_VALUES.includes(max)
  }

  const isValidZoomLevel = (value: number): boolean => ZOOM_LEVEL_VALUES.includes(value)

  useEffect(() => {
    const currentTimeout = debounceTimeoutRef.current
    const isUpdateFromControlChange = Object.entries(
      controls as unknown as Record<string, unknown>
    ).some(([key, value]) => prevControlStateRef.current[key as keyof ChartControlState] !== value)
    const isUpdateFromClassChange = selectedClass !== prevClassRef.current

    prevControlStateRef.current = controls
    prevClassRef.current = selectedClass

    if (isUpdateFromControlChange || isUpdateFromClassChange) {
      // Update URL params if controls or class have changed
      setSearchParamsFromControlState(router, selectedClass, controls, debounceTimeoutRef)
    } else {
      // Otherwise, update controls and class from URL params
      let areAllParamsValid = true

      if (classParam && isValidClass(classParam as string)) {
        setSelectedClass(classParam as CharacterClass)
      } else if (classParam) {
        areAllParamsValid = false
      }

      if (subclassParam && isValidSubclass(subclassParam as string)) {
        controls.setSubclass(subclassParam as SpeedRunSubclass)
      } else if (subclassParam) {
        areAllParamsValid = false
      }

      if (difficulty && !isSunforge && isValidDifficulty(difficulty as string)) {
        controls.setDifficulty(difficulty as Difficulty)
      } else if (difficulty) {
        areAllParamsValid = false
      }

      if (players) {
        const playerValue = Number(players)

        if (isValidPlayerLimit(playerValue)) controls.setPlayerLimit(playerValue)
        else areAllParamsValid = false
      }

      if (duration) {
        const durationValue = Number(duration)

        if (isValidDuration(durationValue)) controls.setMaxDuration(durationValue)
        else areAllParamsValid = false
      }

      if (view) {
        if (isValidViewMode(view as string)) controls.setViewMode(view as ViewMode)
        else areAllParamsValid = false
      }

      if (submissionWindow) {
        if (isValidSubmissionWindow(submissionWindow as string))
          controls.setSubmissionWindow(submissionWindowFromUrlString(submissionWindow as string))
        else areAllParamsValid = false
      }

      if (zoom) {
        const zoomValue = Number(zoom)
        if (isValidZoomLevel(zoomValue)) {
          controls.setZoomLevel(zoomValue)
        } else {
          areAllParamsValid = false
        }
      }

      // If any parameter is invalid, reset URL to previous valid state
      if (!areAllParamsValid) {
        setSearchParamsFromControlState(router, selectedClass, controls, debounceTimeoutRef)
      }
    }

    return () => {
      if (currentTimeout) clearTimeout(currentTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    controls,
    selectedClass,
    isSunforge,
    isValidDuration,
    setSelectedClass,
    classParam,
    subclassParam,
    difficulty,
    players,
    duration,
    view,
    submissionWindow,
    zoom,
    // NB: Never use whole router object in dependencies!
    // router,
  ])
}
