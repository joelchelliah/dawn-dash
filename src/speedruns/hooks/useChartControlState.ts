import { useEffect, useState, useMemo, useRef } from 'react'

import { CharacterClass } from '@/shared/types/characterClass'

import {
  MAX_DURATION_SUNFORGE_DEFAULT,
  PLAYER_LIMIT_DEFAULT,
  VIEW_MODE_DEFAULT,
  ZOOM_LEVEL_DEFAULT,
  MAX_DURATION_OTHER_DEFAULT,
  DIFFICULTY_DEFAULT,
  SUBMISSION_WINDOW_DEFAULT,
  SUBCLASS_DEFAULT,
  VIEW_MODE_SUNFORGE_DEFAULT,
} from '../constants/chartControlValues'
import { ChartControlState, SubmissionWindow, ViewMode } from '../types/chart'
import { Difficulty, SpeedRunSubclass } from '../types/speedRun'

export function useChartControlState(
  selectedClass: CharacterClass,
  selectedDifficulty: Difficulty
): ChartControlState {
  const isInitialMount = useRef(true)
  const previousClass = useRef(selectedClass)

  const isSunforge = selectedClass === CharacterClass.Sunforge
  const subclassDefault = isSunforge ? SUBCLASS_DEFAULT : null
  const maxDurationDefault = isSunforge ? MAX_DURATION_SUNFORGE_DEFAULT : MAX_DURATION_OTHER_DEFAULT
  const viewModeDefault = isSunforge ? VIEW_MODE_SUNFORGE_DEFAULT : VIEW_MODE_DEFAULT

  const [subclass, setSubclass] = useState<SpeedRunSubclass | null>(subclassDefault)
  const [playerLimit, setPlayerLimit] = useState(PLAYER_LIMIT_DEFAULT)
  const [maxDuration, setMaxDuration] = useState(maxDurationDefault)
  const [viewMode, setViewMode] = useState<ViewMode>(viewModeDefault)
  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVEL_DEFAULT)
  const [submissionWindow, setSubmissionWindow] =
    useState<SubmissionWindow>(SUBMISSION_WINDOW_DEFAULT)

  // Use difficulty from URL params as initial default
  const [difficulty, setDifficulty] = useState(selectedDifficulty)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const wasSunforge = previousClass.current === CharacterClass.Sunforge
    previousClass.current = selectedClass

    if (isSunforge !== wasSunforge) {
      setSubclass(subclassDefault)
      setPlayerLimit(PLAYER_LIMIT_DEFAULT)
      setMaxDuration(maxDurationDefault)
      setZoomLevel(ZOOM_LEVEL_DEFAULT)
      setSubmissionWindow(SUBMISSION_WINDOW_DEFAULT)
      setViewMode(viewModeDefault)

      // When class changes, always reset difficulty to DEFAULT regardless of URL params
      setDifficulty(DIFFICULTY_DEFAULT)
    }
  }, [maxDurationDefault, selectedClass, isSunforge, subclassDefault, viewModeDefault])

  return useMemo(
    () => ({
      maxDuration,
      setMaxDuration,
      zoomLevel,
      setZoomLevel,
      viewMode,
      setViewMode,
      playerLimit,
      setPlayerLimit,
      difficulty,
      setDifficulty,
      submissionWindow,
      setSubmissionWindow,
      subclass,
      setSubclass,
    }),
    [maxDuration, zoomLevel, viewMode, playerLimit, difficulty, submissionWindow, subclass]
  )
}
