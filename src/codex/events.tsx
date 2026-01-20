import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { MapOfHuesImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'

import eventTreesData from './data/event-trees.json'
import { Event } from './types/events'
import EventSearchPanel from './components/SearchPanels/EventSearchPanel'
import EventResultsPanel from './components/ResultsPanels/EventResultsPanel'
import { ALL_EVENTS_INDEX } from './constants/eventSearchValues'
import { useAllEventSearchFilters } from './hooks/useSearchFilters/useAllEventSearchFilters'
import { searchEventTree } from './utils/eventTreeSearch'
import styles from './events.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

function Events(): JSX.Element {
  const { resetToEventCodex } = useNavigation()
  const { showScrollToTopButton, scrollToTop } = useScrollToTop()
  const [selectedEventIndex, setSelectedEventIndex] = useState(ALL_EVENTS_INDEX)

  const useSearchFiltersHook = useAllEventSearchFilters()

  // Filter events based on search text (debounced)
  const filteredEvents = eventTrees.filter((event) =>
    searchEventTree(event, useSearchFiltersHook.deferredFilterText)
  )

  const selectedEvent =
    selectedEventIndex === ALL_EVENTS_INDEX ? null : eventTrees[selectedEventIndex]

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToEventCodex}
        logoSrc={MapOfHuesImageUrl}
        title="Dawn-Dash : Questlog"
        subtitle="Dawncaster events codex"
        currentPage="questlog"
      />

      <div className={cx('wip-message')}>🚧 Work in progress...</div>

      <div className={cx('content')}>
        <EventSearchPanel
          selectedEventIndex={selectedEventIndex}
          onEventChange={setSelectedEventIndex}
          filteredEvents={filteredEvents}
          useSearchFilters={useSearchFiltersHook}
        />
        <EventResultsPanel
          selectedEvent={selectedEvent}
          selectedEventIndex={selectedEventIndex}
          allEvents={eventTrees}
          filteredEvents={filteredEvents}
          useSearchFilters={useSearchFiltersHook}
          onEventChange={setSelectedEventIndex}
        />
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} alwaysOnTop />
    </div>
  )
}

export default Events
