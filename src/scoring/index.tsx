import { useEffect, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { PestilenceDecreeUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import ScoringGuidePanel from './components/ScoringGuidePanel'
import BlightbaneScorePanel from './components/BlightbaneScorePanel'
import styles from './index.module.scss'
import { ScoringMode, ScoringPanelId } from './types'
import InGameScorePanel from './components/InGameScorePanel'
import WeeklyChallengePanel from './components/WeeklyChallengePanel'
import { useUrlParams } from './hooks/useUrlParams'
import ExamplesPanel from './components/ExamplesPanel'
import BolgarsBlueprintsPanel from './components/BolgarsBlueprintsPanel'

const cx = createCx(styles)

// Wait for panel to expand, then scroll it into view
const SCROLL_DELAY = 150

const getDefaultPanelForMode = (mode: ScoringMode): ScoringPanelId => {
  switch (mode) {
    case ScoringMode.Standard:
      return ScoringPanelId.StandardScore
    case ScoringMode.Sunforge:
      return ScoringPanelId.SunforgeScore
    case ScoringMode.WeeklyChallenge:
      return ScoringPanelId.WeeklyChallengeScore
    default:
      return ScoringPanelId.StandardScore
  }
}

const getPanelOrder = (mode: ScoringMode): ScoringPanelId[] => {
  switch (mode) {
    case ScoringMode.Standard:
      return [ScoringPanelId.StandardScore, ScoringPanelId.ScoringExample]
    case ScoringMode.Sunforge:
      return [ScoringPanelId.SunforgeScore, ScoringPanelId.ScoringExample]
    case ScoringMode.WeeklyChallenge:
      return [
        ScoringPanelId.WeeklyChallengeScore,
        ScoringPanelId.StandardScore,
        ScoringPanelId.BlightbaneScore,
        ScoringPanelId.ScoringExample,
        ScoringPanelId.BolgarsBlueprints,
      ]
    default:
      return []
  }
}

function useScoringScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 1250 : 1500)
}

function Scoring(): JSX.Element {
  const { resetToScoring } = useNavigation()
  const { showScrollToTopButton, scrollToTop } = useScoringScrollToTop()
  const [selectedMode, setSelectedMode] = useState<ScoringMode>(ScoringMode.Standard)
  const [expandedPanel, setExpandedPanel] = useState<ScoringPanelId | null>(
    getDefaultPanelForMode(ScoringMode.Standard)
  )

  useUrlParams(selectedMode, setSelectedMode)

  const inGameScoreMode =
    selectedMode === ScoringMode.Sunforge ? ScoringMode.Sunforge : ScoringMode.Standard
  const inGamePanelId =
    inGameScoreMode === ScoringMode.Sunforge
      ? ScoringPanelId.SunforgeScore
      : ScoringPanelId.StandardScore

  // Reset to default panel when mode changes
  useEffect(() => {
    setExpandedPanel(getDefaultPanelForMode(selectedMode))
  }, [selectedMode])

  const handlePanelToggle = (panelId: ScoringPanelId) => {
    setExpandedPanel(panelId)

    setTimeout(() => {
      const panelElement = document.querySelector(`[data-panel-id="${panelId}"]`)

      if (panelElement) {
        panelElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }, SCROLL_DELAY)
  }

  const getNextPanelHandler = (currentPanelId: ScoringPanelId) => {
    const panelOrder = getPanelOrder(selectedMode)
    const currentIndex = panelOrder.indexOf(currentPanelId)

    if (currentIndex !== -1 && currentIndex < panelOrder.length - 1) {
      const nextPanelId = panelOrder[currentIndex + 1]

      return () => handlePanelToggle(nextPanelId)
    }

    return undefined
  }

  const isLastPanel = (panelId: ScoringPanelId): boolean => {
    const panelOrder = getPanelOrder(selectedMode)
    const currentIndex = panelOrder.indexOf(panelId)

    return currentIndex === panelOrder.length - 1
  }

  const getPanelProps = (panelId: ScoringPanelId) => ({
    isExpanded: expandedPanel === panelId,
    onShow: () => handlePanelToggle(panelId),
    onNext: getNextPanelHandler(panelId),
    isLastPanel: isLastPanel(panelId),
    panelId,
  })

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToScoring}
        logoSrc={PestilenceDecreeUrl}
        title="Scoring"
        subtitle="Dawncaster scoring guide"
        currentPage="scoring"
      />

      <div className={cx('content')}>
        <ScoringGuidePanel
          selectedMode={selectedMode}
          selectedPanelId={expandedPanel}
          onModeChange={setSelectedMode}
          onNavigateToSection={handlePanelToggle}
        />

        {selectedMode === ScoringMode.WeeklyChallenge && (
          <WeeklyChallengePanel {...getPanelProps(ScoringPanelId.WeeklyChallengeScore)} />
        )}
        <InGameScorePanel mode={inGameScoreMode} {...getPanelProps(inGamePanelId)} />

        {selectedMode === ScoringMode.WeeklyChallenge && (
          <BlightbaneScorePanel {...getPanelProps(ScoringPanelId.BlightbaneScore)} />
        )}

        <ExamplesPanel mode={selectedMode} {...getPanelProps(ScoringPanelId.ScoringExample)} />

        {selectedMode === ScoringMode.WeeklyChallenge && (
          <BolgarsBlueprintsPanel {...getPanelProps(ScoringPanelId.BolgarsBlueprints)} />
        )}
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} alwaysOnTop />
    </div>
  )
}

export default Scoring
