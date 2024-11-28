import {
  ALL_VALUE,
  MAX_DURATION_OTHER_VALUES,
  MAX_DURATION_SCION_VALUES,
  PLAYER_LIMIT_VALUES,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
} from '../../constants/chartControlValues'
import { ChartControlState } from '../../hooks/useChartControlState'
import { ViewMode } from '../../types/chart'
import { SpeedRunClass } from '../../types/speedRun'

import './index.scss'

interface ChartControlsProps {
  controls: ChartControlState
  selectedClass: SpeedRunClass
}

const toPlayerLimitOption = (value: number | string) =>
  value === ALL_VALUE ? { value: 'all', label: 'All' } : { value, label: `${value} players` }

const toMinutesOption = (value: number | string) =>
  value === ALL_VALUE ? { value: 999999, label: 'All' } : { value, label: `${value} minutes` }

const toViewModeOption = (value: ViewMode) => {
  const label = value === ViewMode.Improvements ? 'Self-improving runs' : 'Record-breaking runs'

  return { value, label }
}

const toZoomLevelOption = (value: number) => ({ value, label: `${value}%` })

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
          <label htmlFor="playerLimit">Number of players</label>
          <select
            id="playerLimit"
            value={playerLimit || 'all'}
            onChange={(e) =>
              setPlayerLimit(e.target.value === 'all' ? null : parseInt(e.target.value))
            }
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
