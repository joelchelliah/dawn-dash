import { useEffect, useState } from 'react'

import {
  MAX_DURATION_SCION_DEFAULT,
  PLAYER_LIMIT_DEFAULT,
  VIEW_MODE_DEFAULT,
  ZOOM_LEVEL_DEFAULT,
  MAX_DURATION_OTHER_DEFAULT,
  DIFFICULTY_DEFAULT,
} from '../constants/chartControlValues'
import { ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass } from '../types/speedRun'

export interface ChartControlState {
  difficulty: Difficulty
  setDifficulty: (value: Difficulty) => void
  playerLimit: number | null
  setPlayerLimit: (value: number | null) => void
  maxDuration: number
  setMaxDuration: (value: number) => void
  viewMode: ViewMode
  setViewMode: (value: ViewMode) => void
  zoomLevel: number
  setZoomLevel: (value: number) => void
}

export function useChartControlState(selectedClass: SpeedRunClass): ChartControlState {
  const maxDurationDefault =
    selectedClass === SpeedRunClass.Scion ? MAX_DURATION_SCION_DEFAULT : MAX_DURATION_OTHER_DEFAULT

  const [playerLimit, setPlayerLimit] = useState<number | null>(PLAYER_LIMIT_DEFAULT)
  const [maxDuration, setMaxDuration] = useState(maxDurationDefault)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_DEFAULT)
  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVEL_DEFAULT)
  const [difficulty, setDifficulty] = useState(DIFFICULTY_DEFAULT)

  useEffect(() => {
    setPlayerLimit(PLAYER_LIMIT_DEFAULT)
    setMaxDuration(maxDurationDefault)
    setViewMode(VIEW_MODE_DEFAULT)
    setZoomLevel(ZOOM_LEVEL_DEFAULT)
    setDifficulty(DIFFICULTY_DEFAULT)
  }, [maxDurationDefault, selectedClass])

  return {
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
  }
}
