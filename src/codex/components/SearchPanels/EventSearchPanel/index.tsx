import { useEffect } from 'react'

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
import { UseAllEventSearchFilters } from '@/codex/hooks/useSearchFilters/useAllEventSearchFilters'

import PanelHeader from '../../PanelHeader'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

interface EventSearchPanelProps {
  selectedEventIndex: number
  onEventChange: (index: number) => void
  filteredEvents: Event[]
  useSearchFilters: UseAllEventSearchFilters
}

const getZoomLabel = (zoom: ZoomLevel): string => (zoom === ZoomLevel.COVER ? 'Cover' : `${zoom}%`)

const getLoopingPathModeLabel = (mode: LoopingPathMode): string =>
  mode === LoopingPathMode.INDICATOR
    ? 'With «Loops back» badges on nodes'
    : 'With arrows back to the looping nodes'

const EventSearchPanel = ({
  selectedEventIndex,
  onEventChange,
  filteredEvents,
  useSearchFilters,
}: EventSearchPanelProps) => {
  const selectedClass = CharacterClass.Sunforge
  const {
    filterText,
    setFilterText,
    zoomLevel,
    setZoomLevel,
    showAdvancedOptions,
    setShowAdvancedOptions,
    loopingPathMode,
    setLoopingPathMode,
    resetFilters,
  } = useSearchFilters

  const getAllEventsLabel = () => {
    if (filteredEvents.length === 0) {
      return 'No matching events'
    }
    if (filterText.trim()) {
      return `All matching events (${filteredEvents.length})`
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

  const advancedOptionsArrow = showAdvancedOptions ? '▴' : '▾'

  // Auto-select "All Events" when filter text changes, and is non-empty
  useEffect(() => {
    if (filterText.trim().length > 0) {
      onEventChange(ALL_EVENTS_INDEX)
    }
  }, [filterText, onEventChange])

  // Force Cover mode when switching events to ensure clean coverScale calculation
  useEffect(() => {
    setZoomLevel(ZoomLevel.COVER)
  }, [selectedEventIndex, setZoomLevel])

  const handleResetClick = () => {
    onEventChange(-1)
    resetFilters()
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
            onChange={setZoomLevel}
            disabled={filteredEvents.length === 0 || selectedEventIndex === ALL_EVENTS_INDEX}
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
        {!showAdvancedOptions && (
          <div
            className={cx(
              'control-wrapper',
              'control-wrapper--search-field',
              'control-wrapper--search-field--wide'
            )}
          >
            <SearchField
              keywords={filterText}
              setKeywords={setFilterText}
              placeholder="Filter by any text occurring in the event"
              mode="text"
              selectedClass={selectedClass}
            />
          </div>
        )}
      </div>

      {showAdvancedOptions && (
        <div className={cx('advanced-options')}>
          <div className={cx('advanced-options__content')}>
            <div className={cx('control-wrapper', 'control-wrapper--search-field')}>
              <SearchField
                keywords={filterText}
                setKeywords={setFilterText}
                label="Filter event selection by text"
                placeholder="Any text occurring in the event"
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
                onChange={setLoopingPathMode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventSearchPanel
