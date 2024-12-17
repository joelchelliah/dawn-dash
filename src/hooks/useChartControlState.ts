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

export function useChartControlState(selectedClass: SpeedRunClass): ChartControlState {
  const isInitialMount = useRef(true)
  const previousClass = useRef(selectedClass)

  const isSunforge = selectedClass === SpeedRunClass.Sunforge
  const maxDurationDefault = isSunforge ? MAX_DURATION_SUNFORGE_DEFAULT : MAX_DURATION_OTHER_DEFAULT
  const difficultyDefault = isSunforge ? Difficulty.Impossible : DIFFICULTY_DEFAULT

  const [playerLimit, setPlayerLimit] = useState(PLAYER_LIMIT_DEFAULT)
  const [maxDuration, setMaxDuration] = useState(maxDurationDefault)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_DEFAULT)
  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVEL_DEFAULT)
  const [difficulty, setDifficulty] = useState(difficultyDefault)
  const [gameVersions, setGameVersions] = useState(GAME_VERSION_DEFAULT)

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
      setDifficulty(difficultyDefault)
      setGameVersions(GAME_VERSION_DEFAULT)
    }
  }, [difficultyDefault, maxDurationDefault, selectedClass, isSunforge])

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
      gameVersions,
      setGameVersions,
    }),
    [maxDuration, zoomLevel, viewMode, playerLimit, difficulty, gameVersions]
  )
}
