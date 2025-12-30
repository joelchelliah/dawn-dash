import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { CoinsOfPassingImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'

import eventTreesData from './data/event-trees.json'
import { Event } from './types/events'
import EventSearchPanel from './components/SearchPanels/EventSearchPanel'
import EventResultsPanel from './components/ResultsPanels/EventResultsPanel'
import styles from './events.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

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
        <EventSearchPanel
          selectedEventIndex={selectedEventIndex}
          onEventChange={setSelectedEventIndex}
        />
        <EventResultsPanel selectedEvent={selectedEvent} />
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} />
    </div>
  )
}

export default Events
