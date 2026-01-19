import Image from 'next/image'

import { createCx } from '@/shared/utils/classnames'

import { Event } from '@/codex/types/events'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { eventTypeMapper } from '@/codex/utils/eventListHelper'

import styles from './index.module.scss'

const cx = createCx(styles)

interface EventListProps {
  events: Event[]
  allEvents: Event[]
  filterText: string
  onEventSelect: (eventIndex: number) => void
}

function EventList({ events, allEvents, filterText, onEventSelect }: EventListProps): JSX.Element {
  const renderHeader = () => {
    if (filterText.trim().length > 0) {
      const eventsStr = events.length === 1 ? 'event' : 'events'
      return (
        <span>
          Found <strong>{events.length}</strong> {eventsStr} matching: &quot;
          <span className={cx('event-list-header__filter-text')}>{filterText}</span>&quot;
        </span>
      )
    }
    return `Showing all (${events.length}) events`
  }

  const hasEvents = events.length > 0

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

  return (
    <div className={cx('event-list-container')}>
      {hasEvents ? (
        <>
          <div className={cx('event-list-header')}>
            <h3 className={cx('event-list-header__title')}>{renderHeader()}</h3>
          </div>
          {sortedTypes.map(({ index, events }) => (
            <div key={index} className={cx('event-type-group')}>
              <h4 className={cx('event-type-subheader')}>{eventTypeMapper(index)}</h4>
              <div className={cx('event-list')}>
                {events.map((event, index) => (
                  <EventListItem
                    key={index}
                    event={event}
                    allEvents={allEvents}
                    onEventSelect={onEventSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className={cx('event-list-empty')}>
          Found no events matching:
          <br />
          &quot;<strong>{filterText}</strong>&quot;
        </div>
      )}
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
    const eventIndex = allEvents.indexOf(event)
    onEventSelect(eventIndex)
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
