import { useEffect, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Select from '@/shared/components/Select'
import LoadingDots from '@/shared/components/LoadingDots'
import { CharacterClass } from '@/shared/types/characterClass'
import Button from '@/shared/components/Buttons/Button'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import GradientLink from '@/shared/components/GradientLink'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import eventTreesData from '@/codex/data/event-trees.json'
import { Event } from '@/codex/types/events'
import {
  ZOOM_LEVELS,
  ZoomLevel,
  LoopingPathMode,
  LOOPING_PATH_MODES,
  TreeNavigationMode,
  TREE_NAVIGATION_MODES,
  ALL_EVENTS_INDEX,
  ZOOM_LABEL_MAP,
  LevelOfDetail,
  LEVEL_OF_DETAIL_OPTIONS,
} from '@/codex/constants/eventSearchValues'
import { UseAllEventSearchFilters } from '@/codex/hooks/useSearchFilters/useAllEventSearchFilters'
import { useStickyZoom } from '@/codex/hooks/useStickyZoom'
import Checkbox from '@/codex/components/SearchPanels/shared/FilterGroup/Checkbox'

import PanelHeader from '../../PanelHeader'

import StickyZoomSelect from './StickyZoomSelect'
import styles from './index.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

interface EventSearchPanelProps {
  selectedEventIndex: number
  onEventChange: (index: number) => void
  filteredEvents: Event[]
  useSearchFilters: UseAllEventSearchFilters
}

// En-space character for wide spacing between emoji and text
const wideSpace = ' '

const getLevelOfDetailLabel = (level: LevelOfDetail): string => {
  switch (level) {
    case LevelOfDetail.COMPACT:
      return `🔖${wideSpace}Compressed`
    case LevelOfDetail.BALANCED:
      return `✨${wideSpace}Balanced`
    case LevelOfDetail.WALL_OF_TEXT:
      return `📰${wideSpace}Wall of text!`
  }
}

const getLoopingPathModeLabel = (mode: LoopingPathMode): string =>
  mode === LoopingPathMode.INDICATOR
    ? `🔄${wideSpace}With «Loops back to» tags on nodes`
    : `🔗${wideSpace}With links back to the looping nodes`

const getNavigationModeLabel = (mode: TreeNavigationMode): string =>
  mode === TreeNavigationMode.DRAG
    ? `🖐${wideSpace}By clicking and dragging`
    : `↕️${wideSpace}By scrolling (both directions)`

const EventSearchPanel = ({
  selectedEventIndex,
  onEventChange,
  filteredEvents,
  useSearchFilters,
}: EventSearchPanelProps) => {
  const selectedClass = CharacterClass.Sunforge
  const {
    filterText,
    zoomLevel,
    setZoomLevel,
    showAdvancedOptions,
    setShowAdvancedOptions,
    loopingPathMode,
    setLoopingPathMode,
    navigationMode,
    setNavigationMode,
    levelOfDetail,
    setLevelOfDetail,
    showContinuesTags,
    setShowContinuesTags,
    resetFilters,
  } = useSearchFilters

  const showStickyZoom = useStickyZoom()
  const { isMobile } = useBreakpoint()
  const [isReloadingMap, setIsReloadingMap] = useState(false)
  const loadingColor = getClassColor(CharacterClass.Rogue, ClassColorVariant.Dark)

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
    label: ZOOM_LABEL_MAP[zoom],
  }))

  const levelOfDetailOptions = LEVEL_OF_DETAIL_OPTIONS.map((level) => ({
    value: level,
    label: getLevelOfDetailLabel(level),
  }))

  const loopingPathModeOptions = LOOPING_PATH_MODES.map((mode) => ({
    value: mode,
    label: getLoopingPathModeLabel(mode),
  }))

  const navigationModeOptions = TREE_NAVIGATION_MODES.map((mode) => ({
    value: mode,
    label: getNavigationModeLabel(mode),
  }))

  const advancedOptionsArrow = showAdvancedOptions ? '▴' : '▾'
  const advancedOptionsText = isMobile
    ? `Advanced ${advancedOptionsArrow}`
    : `Advanced options ${advancedOptionsArrow}`

  // Force Cover mode when switching events to ensure clean coverScale calculation
  useEffect(() => {
    setZoomLevel(ZoomLevel.COVER)
  }, [selectedEventIndex, setZoomLevel])

  const handleResetClick = () => {
    resetFilters(() => {
      onEventChange(-1)
    })
  }

  const handleRedrawMap = () => {
    setIsReloadingMap(true)
    window.location.reload()
  }

  const renderRedrawMapMessage = () => {
    if (isReloadingMap) {
      return <LoadingDots color={loadingColor} className={cx('info-message-loading')} />
    }
    return (
      <div className={cx('info-message')}>
        <span className={cx('info-message__emoji')}>ℹ️</span>
        <span className={cx('info-message__text')}>
          Did something go wrong?{' '}
          <GradientLink
            text="Redraw the map"
            onClick={handleRedrawMap}
            className={cx('info-message__link')}
          />
        </span>
      </div>
    )
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
            {advancedOptionsText}
          </GradientButton>
        </div>
      </div>

      {selectedEventIndex !== ALL_EVENTS_INDEX && !showAdvancedOptions && (
        <div className={cx('info-message-wrapper')}>{renderRedrawMapMessage()}</div>
      )}

      {showAdvancedOptions && (
        <div className={cx('advanced-options')}>
          <div className={cx('advanced-options__content')}>
            <div className={cx('control-wrapper', 'control-wrapper--level-of-detail')}>
              <Select
                id="level-of-detail-select"
                selectedClass={selectedClass}
                label="Level of detail"
                options={levelOfDetailOptions}
                value={levelOfDetail}
                onChange={setLevelOfDetail}
              />
            </div>
            <div className={cx('control-wrapper', 'control-wrapper--looping-path')}>
              <Select
                id="looping-path-mode-select"
                selectedClass={selectedClass}
                label="Show looping paths"
                options={loopingPathModeOptions}
                value={loopingPathMode}
                onChange={setLoopingPathMode}
              />
            </div>
            {!isMobile && (
              <div className={cx('control-wrapper', 'control-wrapper--navigation-mode')}>
                <Select
                  id="navigation-mode-select"
                  selectedClass={selectedClass}
                  label="Navigate the tree"
                  options={navigationModeOptions}
                  value={navigationMode}
                  onChange={setNavigationMode}
                />
              </div>
            )}
            <div className={cx('control-wrapper', 'control-wrapper--checkbox')}>
              <Checkbox
                name="show-continues-tags"
                checkboxLabel="Show «Continues» tags"
                checked={showContinuesTags}
                onChange={() => setShowContinuesTags(!showContinuesTags)}
                type="formatting-event"
              />
            </div>
            {selectedEventIndex !== ALL_EVENTS_INDEX && (
              <div className={cx('control-wrapper', 'control-wrapper--info-message')}>
                {renderRedrawMapMessage()}
              </div>
            )}
          </div>
        </div>
      )}

      {showStickyZoom && selectedEventIndex !== ALL_EVENTS_INDEX && (
        <StickyZoomSelect
          selectedClass={selectedClass}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          disabled={filteredEvents.length === 0 || selectedEventIndex === ALL_EVENTS_INDEX}
        />
      )}
    </div>
  )
}

export default EventSearchPanel
