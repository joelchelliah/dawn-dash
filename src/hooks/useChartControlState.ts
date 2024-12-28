import { useEffect, useState, useMemo, useRef } from 'react'

import {
  MAX_DURATION_SUNFORGE_DEFAULT,
  PLAYER_LIMIT_DEFAULT,
  VIEW_MODE_DEFAULT,
  ZOOM_LEVEL_DEFAULT,
  MAX_DURATION_OTHER_DEFAULT,
  DIFFICULTY_DEFAULT,
  GAME_VERSION_DEFAULT,
} from '../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass } from '../types/speedRun'
import { parseVersion } from '../utils/version'

export function useChartControlState(
  selectedClass: SpeedRunClass,
  selectedDifficulty: Difficulty
): ChartControlState {
  const isInitialMount = useRef(true)
  const previousClass = useRef(selectedClass)

  const isSunforge = selectedClass === SpeedRunClass.Sunforge
  const maxDurationDefault = isSunforge ? MAX_DURATION_SUNFORGE_DEFAULT : MAX_DURATION_OTHER_DEFAULT

  const [playerLimit, setPlayerLimit] = useState(PLAYER_LIMIT_DEFAULT)
  const [maxDuration, setMaxDuration] = useState(maxDurationDefault)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_DEFAULT)
  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVEL_DEFAULT)
  const [gameVersion, setGameVersion] = useState(parseVersion(GAME_VERSION_DEFAULT))

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
      setGameVersion(parseVersion(GAME_VERSION_DEFAULT))

      // When class changes, always reset difficulty to DEFAULT regardless of URL params
      setDifficulty(DIFFICULTY_DEFAULT)
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
      gameVersion,
      setGameVersion,
    }),
    [maxDuration, zoomLevel, viewMode, playerLimit, difficulty, gameVersion]
  )
}
