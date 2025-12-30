import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { CoinsOfPassingImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'

import eventTreesData from './data/event-trees.json'
import { EventTree } from './types/events'
import EventTreeVisualization from './components/EventTreeVisualization'
import styles from './events.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as EventTree[]

function Events(): JSX.Element {
  const { resetToEventCodex } = useNavigation()
  const { showScrollToTopButton, scrollToTop } = useScrollToTop()
  const [selectedEventIndex, setSelectedEventIndex] = useState(0)

  const selectedEvent = eventTrees[selectedEventIndex]

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToEventCodex}
        logoSrc={CoinsOfPassingImageUrl}
        title="Dawn-Dash : Eventdex"
        subtitle="Dawncaster events codex"
        currentPage="eventdex"
      />

      <div className={cx('content')}>
        <div className={cx('event-selector')}>
          <label htmlFor="event-select">Select Event:</label>
          <select
            id="event-select"
            value={selectedEventIndex}
            onChange={(e) => setSelectedEventIndex(Number(e.target.value))}
            className={cx('select')}
          >
            {eventTrees.map((event, index) => (
              <option key={index} value={index}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && !selectedEvent.excluded && (
          <EventTreeVisualization event={selectedEvent} />
        )}

        {selectedEvent && selectedEvent.excluded && (
          <div className={cx('excluded-message')}>
            This event has been excluded from visualization.
          </div>
        )}
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} />
    </div>
  )
}

export default Events
