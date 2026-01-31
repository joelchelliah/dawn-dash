import { useState, useEffect } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { MapOfHuesImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import Notification from '@/shared/components/Notification'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import eventTreesData from './data/event-trees.json'
import { Event } from './types/events'
import EventSearchPanel from './components/SearchPanels/EventSearchPanel'
import EventResultsPanel from './components/ResultsPanels/EventResultsPanel'
import { ALL_EVENTS_INDEX } from './constants/eventSearchValues'
import { useAllEventSearchFilters } from './hooks/useSearchFilters/useAllEventSearchFilters'
import { useEventUrlParam } from './hooks/useEventUrlParam'
import { searchEventTree } from './utils/eventTreeSearch'
import styles from './events.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

function useEventsScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 750 : 1500)
}

function Events(): JSX.Element {
  const { resetToEventCodex } = useNavigation()
  const { showScrollToTopButton, scrollToTop } = useEventsScrollToTop()
  const [selectedEventIndex, setSelectedEventIndex] = useState(ALL_EVENTS_INDEX)
  const [showInvalidNotification, setShowInvalidNotification] = useState(false)
  const [pendingEventIndex, setPendingEventIndex] = useState<number | null>(null)

  const useSearchFiltersHook = useAllEventSearchFilters()
  const { isInvalidEvent, eventNameInUrl, selectEventAndUpdateUrl } = useEventUrlParam(
    eventTrees,
    setSelectedEventIndex
  )

  const filteredEvents = eventTrees.filter((event) =>
    searchEventTree(event, useSearchFiltersHook.deferredFilterText)
  )

  const selectedEvent =
    selectedEventIndex === ALL_EVENTS_INDEX ? null : eventTrees[selectedEventIndex]

  const handleEventChange = (index: number) => {
    setPendingEventIndex(index)
    selectEventAndUpdateUrl(index)
  }

  useEffect(() => {
    if (pendingEventIndex !== null && selectedEventIndex === pendingEventIndex) {
      setPendingEventIndex(null)
    }
  }, [pendingEventIndex, selectedEventIndex])

  useEffect(() => {
    if (isInvalidEvent) {
      setShowInvalidNotification(true)
    }
  }, [isInvalidEvent])

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToEventCodex}
        logoSrc={MapOfHuesImageUrl}
        preTitle="Dawn-Dash"
        title="Eventmaps"
        subtitle="Dawncaster event-trees"
        currentPage="eventmaps"
      />

      <div className={cx('content')}>
        <EventSearchPanel
          selectedEventIndex={selectedEventIndex}
          onEventChange={handleEventChange}
          filteredEvents={filteredEvents}
          useSearchFilters={useSearchFiltersHook}
        />
        <EventResultsPanel
          selectedEvent={selectedEvent}
          selectedEventIndex={selectedEventIndex}
          pendingEventIndex={pendingEventIndex}
          allEvents={eventTrees}
          filteredEvents={filteredEvents}
          useSearchFilters={useSearchFiltersHook}
          onEventChange={handleEventChange}
        />
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} alwaysOnTop />

      <Notification
        message={
          <span>
            ⛔️ Couldn&apos;t find event: «<strong>{eventNameInUrl}</strong>».
          </span>
        }
        isTriggered={showInvalidNotification}
        onClose={() => setShowInvalidNotification(false)}
      />
    </div>
  )
}

export default Events
