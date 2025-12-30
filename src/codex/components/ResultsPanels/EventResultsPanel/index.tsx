import { createCx } from '@/shared/utils/classnames'

import { Event } from '@/codex/types/events'

import PanelHeader from '../../PanelHeader'

import EventTree from './EventTree'
import styles from './index.module.scss'

const cx = createCx(styles)

interface EventResultsPanelProps {
  selectedEvent: Event | null
}

const EventResultsPanel = ({ selectedEvent }: EventResultsPanelProps) => {
  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="Results" />

      <div className={cx('results-container')}>
        {selectedEvent && !selectedEvent.excluded && <EventTree event={selectedEvent} />}

        {selectedEvent && selectedEvent.excluded && (
          <div className={cx('excluded-message')}>
            This event has been excluded from visualization.
          </div>
        )}

        {!selectedEvent && (
          <div className={cx('no-event-message')}>
            No event selected! Select an event to visualize.
          </div>
        )}
      </div>
    </div>
  )
}

export default EventResultsPanel
