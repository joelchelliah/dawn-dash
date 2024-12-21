import {
  DIFFICULTY_VALUES,
  GAME_VERSION_LABEL_MAP,
  GAME_VERSION_VALUES,
  MAX_DURATION_OTHER_VALUES,
  MAX_DURATION_SUNFORGE_VALUES,
  PLAYER_LIMIT_VALUES,
  VIEW_MODE_LABELS,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
} from '../../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../../types/chart'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { parseVersion, versionToString } from '../../utils/version'

import './index.scss'

interface ChartControlsProps {
  controls: ChartControlState
  selectedClass: SpeedRunClass
}

const toDifficultyOption = (value: string) => ({ value, label: value })

const toPlayerLimitOption = (value: number) => ({ value, label: `${value} players` })

const toMinutesOption = (value: number) => ({ value, label: `${value} minutes` })

const toViewModeOption = (value: ViewMode) => {
  const label = VIEW_MODE_LABELS[value]

  if (!label) throw new Error(`No label found for view mode: ${value}`)

  return { value, label }
}

const toGameVersionOption = (value: string) => {
  const label = GAME_VERSION_LABEL_MAP[value]

  if (!label) throw new Error(`No label found for game version: ${value}`)

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
    difficulty,
    setDifficulty,
    gameVersion,
    setGameVersion,
  } = controls

  const isSunforge = selectedClass === SpeedRunClass.Sunforge

  const labelColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const labelDisabledColor = getClassColor(selectedClass, ClassColorVariant.Disabled)

  const selectColor = getClassColor(selectedClass, ClassColorVariant.ControlText)
  const selectBorderColor = getClassColor(selectedClass, ClassColorVariant.ControlBorder)

  const labelStyle = { color: labelColor }
  const labelDisabledStyle = { color: labelDisabledColor }
  const selectStyle = { borderColor: selectBorderColor, color: selectColor }

  const getDurationOptions = () =>
    selectedClass === SpeedRunClass.Sunforge
      ? MAX_DURATION_SUNFORGE_VALUES.map(toMinutesOption)
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
          <label htmlFor="difficulty" style={isSunforge ? labelDisabledStyle : labelStyle}>
            Difficulty
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            disabled={isSunforge}
            style={selectStyle}
          >
            {renderOptions(DIFFICULTY_VALUES.map(toDifficultyOption))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="playerLimit" style={labelStyle}>
            Number of players
          </label>
          <select
            id="playerLimit"
            value={playerLimit}
            onChange={(e) => setPlayerLimit(parseInt(e.target.value))}
            style={selectStyle}
          >
            {renderOptions(PLAYER_LIMIT_VALUES.map(toPlayerLimitOption))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="maxDuration" style={labelStyle}>
            Max duration
          </label>
          <select
            id="maxDuration"
            value={maxDuration}
            onChange={(e) => setMaxDuration(parseInt(e.target.value))}
            style={selectStyle}
          >
            {renderOptions(getDurationOptions())}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="viewMode" style={labelStyle}>
            View mode
          </label>
          <select
            id="viewMode"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            style={selectStyle}
          >
            {renderOptions(VIEW_MODE_VALUES.map(toViewModeOption))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="gameVersion" style={labelStyle}>
            Earliest version
          </label>
          <select
            id="gameVersion"
            value={versionToString(gameVersion)}
            onChange={(e) => setGameVersion(parseVersion(e.target.value))}
            style={selectStyle}
          >
            {renderOptions(GAME_VERSION_VALUES.map(toGameVersionOption))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="zoomLevel" style={labelStyle}>
            Zoom level
          </label>
          <select
            id="zoomLevel"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
            style={selectStyle}
          >
            {renderOptions(ZOOM_LEVEL_VALUES.map(toZoomLevelOption))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default ChartControls
