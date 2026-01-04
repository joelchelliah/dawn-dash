import { createCx } from '@/shared/utils/classnames'
import Select from '@/shared/components/Select'
import { CharacterClass } from '@/shared/types/characterClass'

import eventTreesData from '@/codex/data/event-trees.json'
import { Event } from '@/codex/types/events'

import PanelHeader from '../../PanelHeader'

import styles from './index.module.scss'
import { ZOOM_LEVELS } from '@/codex/constants/eventSearchValues'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]
interface EventSearchPanelProps {
  selectedEventIndex: number
  onEventChange: (index: number) => void
  zoomLevel: 'auto' | number
  onZoomChange: (zoom: 'auto' | number) => void
}

const EventSearchPanel = ({
  selectedEventIndex,
  onEventChange,
  zoomLevel,
  onZoomChange,
}: EventSearchPanelProps) => {
  const selectedClass = CharacterClass.Sunforge
  const eventOptions = eventTrees.map((event, index) => ({
    value: index,
    label: event.name,
  }))

  const zoomOptions = ZOOM_LEVELS.map((zoom) => ({
    value: zoom,
    label: zoom === 'auto' ? 'Auto' : `${zoom}%`,
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
      </div>
    </div>
  )
}

export default EventSearchPanel
