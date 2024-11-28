import { useEffect, useState } from 'react'

import {
  MAX_DURATION_SCION_DEFAULT,
  PLAYER_LIMIT_DEFAULT,
  VIEW_MODE_DEFAULT,
  ZOOM_LEVEL_DEFAULT,
  MAX_DURATION_OTHER_DEFAULT,
} from '../constants/chartControlValues'
import { ViewMode } from '../types/chart'
import { SpeedRunClass } from '../types/speedRun'

export interface ChartControlState {
  playerLimit: number | null
  setPlayerLimit: (limit: number | null) => void
  maxDuration: number
  setMaxDuration: (duration: number) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  zoomLevel: number
  setZoomLevel: (level: number) => void
}

export function useChartControlState(selectedClass: SpeedRunClass): ChartControlState {
  const maxDurationDefault =
    selectedClass === SpeedRunClass.Scion ? MAX_DURATION_SCION_DEFAULT : MAX_DURATION_OTHER_DEFAULT

  const [playerLimit, setPlayerLimit] = useState<number | null>(PLAYER_LIMIT_DEFAULT)
  const [maxDuration, setMaxDuration] = useState(maxDurationDefault)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_DEFAULT)
  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVEL_DEFAULT)

  useEffect(() => {
    setPlayerLimit(PLAYER_LIMIT_DEFAULT)
    setMaxDuration(maxDurationDefault)
    setViewMode(VIEW_MODE_DEFAULT)
    setZoomLevel(ZOOM_LEVEL_DEFAULT)
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
  }
}
