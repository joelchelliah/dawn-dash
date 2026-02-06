import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import GradientDivider from '@/shared/components/GradientDivider'
import Image from '@/shared/components/Image'
import LoadingDots from '@/shared/components/LoadingDots'
import { BolgarImageUrl } from '@/shared/utils/imageUrls'
import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

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
  pendingEventIndex: number | null
  allEvents: Event[]
  filteredEvents: Event[]
  useSearchFilters: UseAllEventSearchFilters
  onEventChange: (index: number) => void
}

const EventResultsPanel = ({
  selectedEvent,
  selectedEventIndex,
  pendingEventIndex,
  allEvents,
  filteredEvents,
  useSearchFilters,
  onEventChange,
}: EventResultsPanelProps) => {
  const eventName = selectedEvent?.name ?? 'UNNAMED-EVENT'
  const blightbaneLink = selectedEvent?.blightbaneLink ?? 'MISSING-BLIGHTBANE-URL'

  const { filterText, setFilterText } = useSearchFilters
  const showEventList = selectedEventIndex === ALL_EVENTS_INDEX || filteredEvents.length === 0
  const isNavigating = pendingEventIndex !== null && pendingEventIndex !== selectedEventIndex
  const loadingColor = getClassColor(CharacterClass.Rogue, ClassColorVariant.Dark)

  const renderEventTree = (event: Event) => (
    <>
      <EventTree
        event={event}
        useSearchFilters={useSearchFilters}
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

  return (
    <div className={cx('results-panel')}>
      <div className={cx('results-panel__header')}>
        <PanelHeader type="EventResults" />
      </div>

      <div className={cx('results-panel__container')}>
        {isNavigating ? (
          <div className={cx('results-panel__loading')}>
            <LoadingDots color={loadingColor} className={cx('results-panel__loading-dots')} />
          </div>
        ) : showEventList ? (
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
