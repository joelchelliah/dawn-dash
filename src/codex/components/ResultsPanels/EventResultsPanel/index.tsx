import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'

import { Event } from '@/codex/types/events'

import PanelHeader from '../../PanelHeader'

import EventTree from './EventTree'
import styles from './index.module.scss'

const cx = createCx(styles)

interface EventResultsPanelProps {
  selectedEvent: Event | null
}

const EventResultsPanel = ({ selectedEvent }: EventResultsPanelProps) => {
  const eventName = selectedEvent?.name ?? 'UNNAMED-EVENT'
  const blightbaneLink = `https://www.blightbane.io/event/${eventName.replaceAll(' ', '_')}`
  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="Results" />

      <div className={cx('results-container')}>
        {selectedEvent && !selectedEvent.excluded && (
          <>
            <EventTree event={selectedEvent} />

            <div className={cx('info-message')}>
              Visit <strong>Blightbane</strong> to walk through this event step-by-step:{` `}
              <GradientLink text={eventName} url={blightbaneLink} />
            </div>
          </>
        )}

        {selectedEvent && selectedEvent.excluded && (
          <div className={cx('info-message')}>
            This event hasn&apos;t been fully mapped out. It&apos;s most likely a pure story event
            with no special rewards, or choices that effect your run.
            <br />
            <br />
            You can still explore the event on <strong>Blightbane</strong>:
            <br />
            <br />
            <GradientLink text={eventName} url={blightbaneLink} />
          </div>
        )}

        {!selectedEvent && (
          <div className={cx('info-message')}>No event selected! Select an event to visualize.</div>
        )}
      </div>
    </div>
  )
}

export default EventResultsPanel
