import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import GradientDivider from '@/shared/components/GradientDivider'
import Image from '@/shared/components/Image'
import { BolgarImageUrl } from '@/shared/utils/imageUrls'

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
}

const EventResultsPanel = ({
  selectedEvent,
  selectedEventIndex,
  allEvents,
  filteredEvents,
  useSearchFilters,
  onEventChange,
}: EventResultsPanelProps) => {
  const eventName = selectedEvent?.name ?? 'UNNAMED-EVENT'
  const blightbaneLink = `https://www.blightbane.io/event/${eventName.replaceAll(' ', '_')}`

  const { filterText, setFilterText, zoomLevel, loopingPathMode, navigationMode } = useSearchFilters
  const showEventList = selectedEventIndex === ALL_EVENTS_INDEX || filteredEvents.length === 0

  const temporarilyBlacklistedEvents = [
    // 'Frozen Heart',
    // 'Rotting Residence',
  ] as string[]
  const isTemporarilyBlacklisted =
    temporarilyBlacklistedEvents.includes(eventName) && process.env.NODE_ENV === 'production'

  const renderEventTree = (event: Event) => {
    const visitBlightbaneMessage = (
      <>
        <br />
        <GradientDivider widthPercentage={85} spacingBottom="xs" />
        <div className={cx('info-message')}>
          Visit <strong>Blightbane</strong> to walk through this event step-by-step:{` `}
          <GradientLink text={eventName} url={blightbaneLink} />
        </div>
      </>
    )
    if (isTemporarilyBlacklisted) {
      return (
        <>
          <div className={cx('info-message')}>
            🏗️ <strong>{eventName}</strong> is not quite ready yet. Coming soon!
            <br />
            <GradientLink
              text="Go back to all events"
              onClick={() => onEventChange(ALL_EVENTS_INDEX)}
            />
          </div>
          {visitBlightbaneMessage}
        </>
      )
    }

    return (
      <>
        <EventTree
          event={event}
          zoomLevel={zoomLevel}
          loopingPathMode={loopingPathMode}
          navigationMode={navigationMode}
          onAllEventsClick={() => onEventChange(ALL_EVENTS_INDEX)}
        />
        <br />
        <br />
        <GradientDivider widthPercentage={85} spacingBottom="xs" />
        <div className={cx('info-message')}>
          <Image
            className={cx('info-message__icon')}
            src={BolgarImageUrl}
            alt="Bolgar Blightbane"
            width={38}
            height={26}
          />
          Visit <strong>Blightbane</strong> to walk through this event step-by-step:{` `}
          <GradientLink text={eventName} url={blightbaneLink} />
        </div>
      </>
    )
  }

  return (
    <div className={cx('results-panel')}>
      <div className={cx('results-panel__header')}>
        <PanelHeader type="EventResults" />
      </div>

      <div className={cx('results-panel__container')}>
        {showEventList ? (
          <div className={cx('results-panel__event-list')}>
            <EventList
              events={filteredEvents}
              allEvents={allEvents}
              filterText={filterText}
              setFilterText={setFilterText}
              onEventSelect={onEventChange}
            />
          </div>
        ) : selectedEvent ? (
          renderEventTree(selectedEvent)
        ) : (
          <div className={cx('info-message')}>No event selected! Select an event to visualize.</div>
        )}
      </div>
    </div>
  )
}

export default EventResultsPanel
