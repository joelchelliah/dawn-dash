import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import GradientDivider from '@/shared/components/GradientDivider'

import { Event } from '@/codex/types/events'
import { ALL_EVENTS_INDEX } from '@/codex/constants/eventSearchValues'
import { UseAllEventSearchFilters } from '@/codex/hooks/useSearchFilters/useAllEventSearchFilters'

import PanelHeader from '../../PanelHeader'

import EventTree from './EventTree'
import EventList from './EventList'
import styles from './index.module.scss'

const cx = createCx(styles)

interface EventResultsPanelProps {
  selectedEvent: Event | null
  selectedEventIndex: number
  allEvents: Event[]
  filteredEvents: Event[]
  useSearchFilters: UseAllEventSearchFilters
  onEventChange: (index: number) => void
  onEditFilter?: () => void
}

const EventResultsPanel = ({
  selectedEvent,
  selectedEventIndex,
  allEvents,
  filteredEvents,
  useSearchFilters,
  onEventChange,
  onEditFilter,
}: EventResultsPanelProps) => {
  const eventName = selectedEvent?.name ?? 'UNNAMED-EVENT'
  const blightbaneLink = `https://www.blightbane.io/event/${eventName.replaceAll(' ', '_')}`

  const { filterText, zoomLevel, loopingPathMode } = useSearchFilters
  const showEventList = selectedEventIndex === ALL_EVENTS_INDEX || filteredEvents.length === 0

  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="EventResults" />

      <div className={cx('results-container')}>
        {showEventList && (
          <EventList
            events={filteredEvents}
            allEvents={allEvents}
            filterText={filterText}
            onEventSelect={onEventChange}
            onEditFilter={onEditFilter}
          />
        )}

        {!showEventList && selectedEvent && !selectedEvent.excluded && (
          <>
            <EventTree
              event={selectedEvent}
              zoomLevel={zoomLevel}
              loopingPathMode={loopingPathMode}
            />
            <br />
            <br />
            <GradientDivider widthPercentage={85} spacingBottom="xs" />
            <div className={cx('info-message')}>
              Visit <strong>Blightbane</strong> to walk through this event step-by-step:{` `}
              <GradientLink text={eventName} url={blightbaneLink} />
            </div>
          </>
        )}

        {!showEventList && selectedEvent && selectedEvent.excluded && (
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

        {!showEventList && !selectedEvent && (
          <div className={cx('info-message')}>No event selected! Select an event to visualize.</div>
        )}
      </div>
    </div>
  )
}

export default EventResultsPanel
