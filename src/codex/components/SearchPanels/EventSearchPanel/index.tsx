import { createCx } from '@/shared/utils/classnames'
import Select from '@/shared/components/Select'
import { CharacterClass } from '@/shared/types/characterClass'

import eventTreesData from '@/codex/data/event-trees.json'
import { Event } from '@/codex/types/events'
import {
  ZOOM_LEVELS,
  ZoomLevel,
  LoopingPathMode,
  LOOPING_PATH_MODES,
} from '@/codex/constants/eventSearchValues'

import PanelHeader from '../../PanelHeader'

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

const getZoomLabel = (zoom: ZoomLevel): string => {
  if (zoom === 'auto') return 'Auto'
  if (zoom === 'cover') return 'Cover'
  return `${zoom}%`
}

const getLoopingPathModeLabel = (mode: LoopingPathMode): string => {
  if (mode === LoopingPathMode.INDICATOR) return 'With «Repeatable» indicators'
  return 'With links back to repeating nodes'
}

const EventSearchPanel = ({
  selectedEventIndex,
  onEventChange,
  zoomLevel,
  onZoomChange,
  loopingPathMode,
  onLoopingPathModeChange,
}: EventSearchPanelProps) => {
  const selectedClass = CharacterClass.Sunforge
  const eventOptions = eventTrees.map((event, index) => ({
    value: index,
    label: event.name,
  }))

  const zoomOptions = ZOOM_LEVELS.map((zoom) => ({
    value: zoom,
    label: getZoomLabel(zoom),
  }))

  const loopingPathModeOptions = LOOPING_PATH_MODES.map((mode) => ({
    value: mode,
    label: getLoopingPathModeLabel(mode),
  }))

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

        <div className={cx('control-wrapper', 'control-wrapper--looping-path')}>
          <Select
            id="looping-path-mode-select"
            selectedClass={selectedClass}
            label="Display looping paths"
            options={loopingPathModeOptions}
            value={loopingPathMode}
            onChange={onLoopingPathModeChange}
          />
        </div>
      </div>
    </div>
  )
}

export default EventSearchPanel
