import { useEffect, useState, useMemo, useRef } from 'react'

import {
  MAX_DURATION_SUNFORGE_DEFAULT,
  PLAYER_LIMIT_DEFAULT,
  VIEW_MODE_DEFAULT,
  ZOOM_LEVEL_DEFAULT,
  MAX_DURATION_OTHER_DEFAULT,
  DIFFICULTY_DEFAULT,
  SUBMISSION_WINDOW_DEFAULT,
  SUBCLASS_DEFAULT,
} from '../constants/chartControlValues'
import { ChartControlState, SubmissionWindow, ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass, SpeedRunSubclass } from '../types/speedRun'

export function useChartControlState(
  selectedClass: SpeedRunClass,
  selectedDifficulty: Difficulty
): ChartControlState {
  const isInitialMount = useRef(true)
  const previousClass = useRef(selectedClass)
  const [subclass, setSubclass] = useState<SpeedRunSubclass | null>(null)

  const isSunforge = selectedClass === SpeedRunClass.Sunforge
  const maxDurationDefault = isSunforge ? MAX_DURATION_SUNFORGE_DEFAULT : MAX_DURATION_OTHER_DEFAULT

  const [playerLimit, setPlayerLimit] = useState(PLAYER_LIMIT_DEFAULT)
  const [maxDuration, setMaxDuration] = useState(maxDurationDefault)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_DEFAULT)
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

    const wasSunforge = previousClass.current === SpeedRunClass.Sunforge
    previousClass.current = selectedClass

    if (isSunforge !== wasSunforge) {
      setPlayerLimit(PLAYER_LIMIT_DEFAULT)
      setMaxDuration(maxDurationDefault)
      setViewMode(VIEW_MODE_DEFAULT)
      setZoomLevel(ZOOM_LEVEL_DEFAULT)
      setSubmissionWindow(SUBMISSION_WINDOW_DEFAULT)

      // When class changes, always reset difficulty to DEFAULT regardless of URL params
      setDifficulty(DIFFICULTY_DEFAULT)

      if (isSunforge) {
        setSubclass(SUBCLASS_DEFAULT)
      } else {
        setSubclass(null)
      }
    }
  }, [maxDurationDefault, selectedClass, isSunforge])

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
