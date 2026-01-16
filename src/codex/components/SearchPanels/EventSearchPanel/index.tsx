import { useState, useEffect } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Select from '@/shared/components/Select'
import { CharacterClass } from '@/shared/types/characterClass'
import Button from '@/shared/components/Buttons/Button'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

import eventTreesData from '@/codex/data/event-trees.json'
import { Event } from '@/codex/types/events'
import {
  ZOOM_LEVELS,
  ZoomLevel,
  LoopingPathMode,
  LOOPING_PATH_MODES,
  ALL_EVENTS_INDEX,
} from '@/codex/constants/eventSearchValues'
import { searchEventTree } from '@/codex/utils/eventTreeSearch'

import PanelHeader from '../../PanelHeader'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]
interface EventSearchPanelProps {
  selectedEventIndex: number
  onEventChange: (index: number) => void
  zoomLevel: ZoomLevel
  onZoomChange: (zoom: ZoomLevel) => void
  loopingPathMode: LoopingPathMode
  onLoopingPathModeChange: (mode: LoopingPathMode) => void
}

const getZoomLabel = (zoom: ZoomLevel): string => (zoom === ZoomLevel.COVER ? 'Cover' : `${zoom}%`)

const getLoopingPathModeLabel = (mode: LoopingPathMode): string =>
  mode === LoopingPathMode.INDICATOR
    ? 'With «Repeatable» badges on nodes'
    : 'With lines back to the repeating nodes'

const EventSearchPanel = ({
  selectedEventIndex,
  onEventChange,
  zoomLevel,
  onZoomChange,
  loopingPathMode,
  onLoopingPathModeChange,
}: EventSearchPanelProps) => {
  const selectedClass = CharacterClass.Sunforge
  const [filterText, setFilterText] = useState('')

  // Filter events based on search text
  const filteredEvents = eventTrees.filter((event) => searchEventTree(event, filterText))

  const getAllEventsLabel = () => {
    if (filteredEvents.length === 0) {
      return 'No matching events'
    }
    if (filterText.trim()) {
      return `Filtered events (${filteredEvents.length})`
    }
    return `All events (${filteredEvents.length})`
  }

  const eventOptions = [
    {
      value: ALL_EVENTS_INDEX,
      label: getAllEventsLabel(),
    },
    ...filteredEvents.map((event) => ({
      value: eventTrees.indexOf(event),
      label: event.name,
    })),
  ]

  const zoomOptions = ZOOM_LEVELS.map((zoom) => ({
    value: zoom,
    label: getZoomLabel(zoom),
  }))

  const loopingPathModeOptions = LOOPING_PATH_MODES.map((mode) => ({
    value: mode,
    label: getLoopingPathModeLabel(mode),
  }))

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const advancedOptionsArrow = showAdvancedOptions ? '▴' : '▾'

  const renderFilterIndicatorText = () => {
    switch (filteredEvents.length) {
      case 0:
        return 'Found no events containing: '
      case 1:
        return 'Found 1 event containing: '
      default:
        return `Found ${filteredEvents.length} events containing: `
    }
  }

  // Handle case where currently selected event is filtered out
  useEffect(() => {
    if (selectedEventIndex === ALL_EVENTS_INDEX) return

    const isSelectedEventInFilteredList = filteredEvents.some(
      (event) => eventTrees.indexOf(event) === selectedEventIndex
    )

    if (!isSelectedEventInFilteredList && filteredEvents.length > 0) {
      onEventChange(ALL_EVENTS_INDEX)
    }
  }, [filterText, selectedEventIndex, filteredEvents, onEventChange])

  // Force Cover mode when switching events to ensure clean coverScale calculation
  useEffect(() => {
    onZoomChange(ZoomLevel.COVER)
  }, [selectedEventIndex, onZoomChange])

  const handleResetClick = () => {
    onEventChange(-1)
    onZoomChange(ZoomLevel.COVER)
    setFilterText('')
    onLoopingPathModeChange(LoopingPathMode.INDICATOR)
  }

  return (
    <div className={cx('search-panel')}>
      <PanelHeader type="Search" />

      <div className={cx('controls')}>
        <div className={cx('control-wrapper', 'control-wrapper--event')}>
          <Select
            id="event-select"
            selectedClass={selectedClass}
            label="Select Event"
            options={eventOptions}
            value={selectedEventIndex}
            onChange={onEventChange}
            disabled={filteredEvents.length === 0}
          />
        </div>

        <div className={cx('control-wrapper', 'control-wrapper--zoom')}>
          <Select
            id="zoom-select"
            selectedClass={selectedClass}
            label="Zoom"
            options={zoomOptions}
            value={zoomLevel}
            onChange={onZoomChange}
          />
        </div>
        <div className={cx('control-wrapper', 'control-wrapper--button-wrapper')}>
          <Button
            className={cx('control-wrapper--reset-search-button')}
            style={{
              color: getClassColor(selectedClass, ClassColorVariant.Light),
              borderColor: getClassColor(selectedClass, ClassColorVariant.Dark),
            }}
            onClick={handleResetClick}
          >
            Reset search
          </Button>
        </div>
        <div className={cx('control-wrapper', 'control-wrapper--button-wrapper')}>
          <GradientButton
            className={cx('control-wrapper--advanced-options-button')}
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            Advanced options {advancedOptionsArrow}
          </GradientButton>
        </div>
      </div>

      {!showAdvancedOptions && filterText.trim() && (
        <div className={cx('filter-indicator')}>
          {renderFilterIndicatorText()}
          &quot;
          <span className={cx('filter-indicator__text')}>
            {filterText}
            &quot;.
          </span>
        </div>
      )}

      {showAdvancedOptions && (
        <div className={cx('advanced-options')}>
          <div className={cx('advanced-options__content')}>
            <div className={cx('control-wrapper', 'control-wrapper--search-field')}>
              <SearchField
                keywords={filterText}
                setKeywords={setFilterText}
                mode="text"
                selectedClass={selectedClass}
              />
            </div>
            <div className={cx('control-wrapper', 'control-wrapper--looping-path')}>
              <Select
                id="looping-path-mode-select"
                selectedClass={selectedClass}
                label="🔄 &nbsp;Show looping paths"
                options={loopingPathModeOptions}
                value={loopingPathMode}
                onChange={onLoopingPathModeChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventSearchPanel
