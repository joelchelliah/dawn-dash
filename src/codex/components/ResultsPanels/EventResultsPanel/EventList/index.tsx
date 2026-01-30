import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { Event } from '@/codex/types/events'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { eventTypeMapper } from '@/codex/utils/eventListHelper'
import SearchField from '@/codex/components/SearchPanels/shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

interface EventListProps {
  events: Event[]
  allEvents: Event[]
  filterText: string
  setFilterText: (text: string) => void
  onEventSelect: (eventIndex: number) => void
}

function EventList({
  events,
  allEvents,
  filterText,
  setFilterText,
  onEventSelect,
}: EventListProps): JSX.Element {
  const selectedClass = CharacterClass.Sunforge
  const noEventsFound = events.length === 0
  const { isMobile } = useBreakpoint()

  const renderEventCountText = () => {
    if (filterText.trim().length > 0) {
      const eventsStr = events.length === 1 ? 'event' : 'events'
      return (
        <span>
          Found <span className={cx('event-list-count__filter-count')}>{events.length}</span>{' '}
          {eventsStr} matching: &quot;
          <span className={cx('event-list-count__filter-text')}>{filterText}</span>&quot;
        </span>
      )
    }
    return `Showing all (${events.length}) events`
  }

  // Group events by type
  const eventsByType = events.reduce(
    (groups, event) => {
      const type = eventTypeMapper(event.type)
      if (!groups[type]) {
        groups[type] = { index: event.type, events: [] }
      }
      groups[type].events.push(event)
      return groups
    },
    {} as Record<string, { index: number; events: Event[] }>
  )

  // Sort events alphabetically within each type group
  Object.keys(eventsByType).forEach((typeKey) => {
    eventsByType[typeKey].events.sort((a, b) => a.name.localeCompare(b.name))
  })

  const sortedTypes = Object.values(eventsByType).sort((a, b) => a.index - b.index)
  const filterPlaceholder = isMobile
    ? 'Filter by any text occurring in the event'
    : 'Filter by any text occurring anywhere in the event'

  return (
    <div className={cx('event-list-container')}>
      <div className={cx('event-list-filter')}>
        <SearchField
          keywords={filterText}
          setKeywords={setFilterText}
          placeholder={filterPlaceholder}
          mode="text"
          selectedClass={selectedClass}
        />
      </div>

      <h3
        className={cx('event-list-count', {
          'event-list-count--no-events': noEventsFound,
        })}
      >
        {renderEventCountText()}
      </h3>

      {sortedTypes.map(({ index, events }) => (
        <div key={index} className={cx('event-type-group')}>
          <h4 className={cx('event-type-subheader')}>{eventTypeMapper(index)}</h4>
          <div className={cx('event-list')}>
            {events.map((event, index) => (
              <EventListItem
                key={`${event.name}-${index}`}
                event={event}
                allEvents={allEvents}
                onEventSelect={onEventSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface EventListItemProps {
  event: Event
  allEvents: Event[]
  onEventSelect: (eventIndex: number) => void
}

function EventListItem({ event, allEvents, onEventSelect }: EventListItemProps): JSX.Element {
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(event.artwork)

  const handleClick = () => {
    let eventIndex = allEvents.indexOf(event)
    if (eventIndex === -1) {
      eventIndex = allEvents.findIndex((e) => e.name === event.name)
    }
    if (eventIndex >= 0) {
      onEventSelect(eventIndex)
    }
  }

  return (
    <div className={cx('event-list-item')} onClick={handleClick}>
      <Image
        src={eventImageSrc}
        alt={event.name}
        width={40}
        height={40}
        className={cx('event-list-item__artwork')}
        onError={onImageSrcError}
      />
      <span
        className={cx('event-list-item__name', {
          'event-list-item__name--long': event.name.length > 20,
        })}
      >
        {event.name}
      </span>
    </div>
  )
}

export default EventList
