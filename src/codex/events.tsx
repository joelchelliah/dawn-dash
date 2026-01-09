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
import { ZoomLevel, LoopingPathMode } from './constants/eventSearchValues'
import styles from './events.module.scss'

const cx = createCx(styles)

const eventTrees = eventTreesData as Event[]

function Events(): JSX.Element {
  const { resetToEventCodex } = useNavigation()
  const { showScrollToTopButton, scrollToTop } = useScrollToTop()
  const [selectedEventIndex, setSelectedEventIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('auto')
  const [loopingPathMode, setLoopingPathMode] = useState<LoopingPathMode>(LoopingPathMode.INDICATOR)

  const selectedEvent = eventTrees[selectedEventIndex]

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
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          loopingPathMode={loopingPathMode}
          onLoopingPathModeChange={setLoopingPathMode}
        />
        <EventResultsPanel
          selectedEvent={selectedEvent}
          zoomLevel={zoomLevel}
          loopingPathMode={loopingPathMode}
        />
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} alwaysOnTop />
    </div>
  )
}

export default Events
