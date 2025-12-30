import { createCx } from '@/shared/utils/classnames'

import eventTreesData from '@/codex/data/event-trees.json'
import { Event } from '@/codex/types/events'

import PanelHeader from '../../PanelHeader'

import styles from './index.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

interface EventSearchPanelProps {
  selectedEventIndex: number
  onEventChange: (index: number) => void
}

const EventSearchPanel = ({ selectedEventIndex, onEventChange }: EventSearchPanelProps) => {
  return (
    <div className={cx('search-panel')}>
      <PanelHeader type="Search" />

      <div className={cx('event-selector')}>
        <label htmlFor="event-select" className={cx('event-selector__label')}>
          Select Event:
        </label>
        <select
          id="event-select"
          value={selectedEventIndex}
          onChange={(e) => onEventChange(Number(e.target.value))}
          className={cx('event-selector__select')}
        >
          {eventTrees.map((event, index) => (
            <option key={index} value={index}>
              {event.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default EventSearchPanel
