import { useEffect, useRef, useState } from 'react'

import { GAME_VERSION_VALUES } from '../../constants/chartControlValues'

import './index.scss'

interface GameVersionsMultiSelectProps {
  gameVersions: Set<string>
  setGameVersions: (gameVersions: Set<string>) => void
  style?: React.CSSProperties
}

/**
 * A multi-select component to select several game versions to show in the chart.
 *
 * Currently not in use!
 *
 * Not sure if this is the best way to do this... Might get a bit confusing when
 * selecting to show non-sequential versions?
 */

function GameVersionsMultiSelect({
  gameVersions,
  setGameVersions,
  style,
}: GameVersionsMultiSelectProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [pendingVersions, setPendingVersions] = useState(gameVersions)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close game version dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const onChange = (version: string) => {
    const newVersions = new Set(pendingVersions)

    if (newVersions.has(version)) newVersions.delete(version)
    else newVersions.add(version)

    setPendingVersions(newVersions)
  }

  const selectAllVersions = () => setPendingVersions(new Set(GAME_VERSION_VALUES))

  const deselectAllVersions = () => setPendingVersions(new Set())

  const applyPendingVersions = () => {
    setGameVersions(pendingVersions)
    setIsDropdownOpen(false)
  }

  const renderSelectedLabel = () => {
    return pendingVersions.size === 0
      ? 'Select Versions'
      : pendingVersions.size === GAME_VERSION_VALUES.length
        ? 'All Versions'
        : `${pendingVersions.size} Versions Selected`
  }

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <button
        className="multi-select-trigger"
        onClick={() => {
          setIsDropdownOpen(!isDropdownOpen)
          setPendingVersions(gameVersions) // Reset temp state when opening
        }}
        style={style}
      >
        {renderSelectedLabel()}
      </button>
      {isDropdownOpen && (
        <div className="multi-select">
          {GAME_VERSION_VALUES.map((version) => (
            <label key={version} className="checkbox-option">
              <input
                type="checkbox"
                checked={pendingVersions.has(version)}
                onChange={() => onChange(version)}
              />
              <span>{version}</span>
            </label>
          ))}
          <div className="button-group">
            <button
              className="select-all-button"
              onClick={
                pendingVersions.size === GAME_VERSION_VALUES.length
                  ? deselectAllVersions
                  : selectAllVersions
              }
            >
              {pendingVersions.size === GAME_VERSION_VALUES.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              className="apply-button"
              onClick={applyPendingVersions}
              disabled={pendingVersions.size === 0}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameVersionsMultiSelect
