import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

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
import SearchField, { SearchFieldRef } from '../shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

export interface EventSearchPanelRef {
  focusFilterInput: () => void
}

interface EventSearchPanelProps {
  selectedEventIndex: number
  onEventChange: (index: number) => void
  zoomLevel: ZoomLevel
  onZoomChange: (zoom: ZoomLevel) => void
  loopingPathMode: LoopingPathMode
  onLoopingPathModeChange: (mode: LoopingPathMode) => void
  filterText: string
  onFilterTextChange: (text: string) => void
  showAdvancedOptions: boolean
  setShowAdvancedOptions: (show: boolean) => void
}

const getZoomLabel = (zoom: ZoomLevel): string => (zoom === ZoomLevel.COVER ? 'Cover' : `${zoom}%`)

const getLoopingPathModeLabel = (mode: LoopingPathMode): string =>
  mode === LoopingPathMode.INDICATOR
    ? 'With «Repeatable» badges on nodes'
    : 'With lines back to the repeating nodes'

const EventSearchPanel = forwardRef<EventSearchPanelRef, EventSearchPanelProps>(
  (
    {
      selectedEventIndex,
      onEventChange,
      zoomLevel,
      onZoomChange,
      loopingPathMode,
      onLoopingPathModeChange,
      filterText,
      onFilterTextChange,
      showAdvancedOptions,
      setShowAdvancedOptions,
    },
    ref
  ) => {
    const selectedClass = CharacterClass.Sunforge
    const searchFieldRef = useRef<SearchFieldRef>(null)

    useImperativeHandle(ref, () => ({
      focusFilterInput: () => {
        searchFieldRef.current?.focus()
      },
    }))

    const filteredEvents = eventTrees.filter((event) => searchEventTree(event, filterText))

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
      onZoomChange(ZoomLevel.COVER)
    }, [selectedEventIndex, onZoomChange])

    const handleResetClick = () => {
      onEventChange(-1)
      onZoomChange(ZoomLevel.COVER)
      onFilterTextChange('')
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

        {showAdvancedOptions && (
          <div className={cx('advanced-options')}>
            <div className={cx('advanced-options__content')}>
              <div className={cx('control-wrapper', 'control-wrapper--search-field')}>
                <SearchField
                  ref={searchFieldRef}
                  keywords={filterText}
                  setKeywords={onFilterTextChange}
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
)

EventSearchPanel.displayName = 'EventSearchPanel'

export default EventSearchPanel
