import {
  DIFFICULTY_VALUES,
  MAX_DURATION_OTHER_VALUES,
  MAX_DURATION_SCION_VALUES,
  PLAYER_LIMIT_VALUES,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
} from '../../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../../types/chart'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'

import './index.scss'

interface ChartControlsProps {
  controls: ChartControlState
  selectedClass: SpeedRunClass
}

const toPlayerLimitOption = (value: number) => ({ value, label: `${value} players` })

const toMinutesOption = (value: number) => ({ value, label: `${value} minutes` })

const toViewModeOption = (value: ViewMode) => {
  const label = value === ViewMode.Improvements ? 'Self-improving runs' : 'Record-breaking runs'

  return { value, label }
}

const toZoomLevelOption = (value: number) => ({ value, label: `${value}%` })

const toDifficultyOption = (value: string) => ({ value, label: value })

function ChartControls({ controls, selectedClass }: ChartControlsProps) {
  const {
    maxDuration,
    setMaxDuration,
    viewMode,
    setViewMode,
    playerLimit,
    setPlayerLimit,
    zoomLevel,
    setZoomLevel,
    difficulty,
    setDifficulty,
  } = controls

  const getDurationOptions = () =>
    selectedClass === SpeedRunClass.Scion
      ? MAX_DURATION_SCION_VALUES.map(toMinutesOption)
      : MAX_DURATION_OTHER_VALUES.map(toMinutesOption)

  const renderOptions = (options: { value: number | string; label: string }[]) =>
    options.map(({ value, label }) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))

  return (
    <div className="chart-controls">
      <div className="controls-row">
        <div className="control-group">
          <label htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {renderOptions(DIFFICULTY_VALUES.map(toDifficultyOption))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="playerLimit">Number of players</label>
          <select
            id="playerLimit"
            value={playerLimit}
            onChange={(e) => setPlayerLimit(parseInt(e.target.value))}
          >
            {renderOptions(PLAYER_LIMIT_VALUES.map(toPlayerLimitOption))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="maxDuration">Max duration</label>
          <select
            id="maxDuration"
            value={maxDuration}
            onChange={(e) => setMaxDuration(parseInt(e.target.value))}
          >
            {renderOptions(getDurationOptions())}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="viewMode">View mode</label>
          <select
            id="viewMode"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
          >
            {renderOptions(VIEW_MODE_VALUES.map(toViewModeOption))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="zoomLevel">Zoom level</label>
          <select
            id="zoomLevel"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
          >
            {renderOptions(ZOOM_LEVEL_VALUES.map(toZoomLevelOption))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default ChartControls
