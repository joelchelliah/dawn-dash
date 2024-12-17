import { useState, useRef, useEffect } from 'react'

import {
  DIFFICULTY_VALUES,
  MAX_DURATION_OTHER_VALUES,
  MAX_DURATION_SUNFORGE_VALUES,
  PLAYER_LIMIT_VALUES,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
  GAME_VERSION_VALUES,
} from '../../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../../types/chart'
import { Difficulty, GameVersion, SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'

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
    gameVersions,
    setGameVersions,
  } = controls

  const [isGameVersionDropdownOpen, setIsGameVersionDropdownOpen] = useState(false)
  const [pendingGameVersions, setPendingGameVersions] = useState(gameVersions)
  const gameVersionDropdownRef = useRef<HTMLDivElement>(null)

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

  const handleGameVersionChange = (version: GameVersion) => {
    const newVersions = new Set(pendingGameVersions)

    if (newVersions.has(version)) newVersions.delete(version)
    else newVersions.add(version)

    setPendingGameVersions(newVersions)
  }

  const handleSelectAllGameVersions = () => setPendingGameVersions(new Set(GAME_VERSION_VALUES))

  const handleDeselectAllGameVersions = () => setPendingGameVersions(new Set())

  const handleApplyPendingGameVersions = () => {
    setGameVersions(pendingGameVersions)
    setIsGameVersionDropdownOpen(false)
  }

  const renderGameVersionSelectedLabel = () => {
    const selectedCount = gameVersions.size
    if (selectedCount === 0) return 'Select version'
    if (selectedCount === GAME_VERSION_VALUES.length) return 'All versions'
    return `${selectedCount} versions selected`
  }

  // Close game version dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        gameVersionDropdownRef.current &&
        !gameVersionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGameVersionDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          <label style={labelStyle}>Game versions</label>
          <div className="multi-select-container" ref={gameVersionDropdownRef}>
            <button
              className="multi-select-trigger"
              onClick={() => {
                setIsGameVersionDropdownOpen(!isGameVersionDropdownOpen)
                setPendingGameVersions(controls.gameVersions) // Reset temp state when opening
              }}
              style={selectStyle}
            >
              {renderGameVersionSelectedLabel()}
            </button>
            {isGameVersionDropdownOpen && (
              <div className="multi-select">
                {GAME_VERSION_VALUES.map((version) => (
                  <label key={version} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={pendingGameVersions.has(version)}
                      onChange={() => handleGameVersionChange(version)}
                    />
                    <span>{version}</span>
                  </label>
                ))}
                <div className="button-group">
                  <button
                    className="select-all-button"
                    onClick={
                      pendingGameVersions.size === GAME_VERSION_VALUES.length
                        ? handleDeselectAllGameVersions
                        : handleSelectAllGameVersions
                    }
                  >
                    {pendingGameVersions.size === GAME_VERSION_VALUES.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                  <button
                    className="apply-button"
                    onClick={handleApplyPendingGameVersions}
                    disabled={pendingGameVersions.size === 0}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
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
