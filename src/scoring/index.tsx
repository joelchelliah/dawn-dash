import { useState } from 'react'

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
import { useWeeklyChallengeData } from './hooks/useWeeklyChallengeData'
import { useSelectedPanel } from './hooks/useSelectedPanel'

const cx = createCx(styles)

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
  const weeklyChallengeData = useWeeklyChallengeData()
  const [selectedMode, setSelectedMode] = useState<ScoringMode>(ScoringMode.Standard)
  const { selectedPanel, onSelectPanel } = useSelectedPanel(selectedMode)

  useUrlParams(selectedMode, setSelectedMode)

  const inGameScoreMode =
    selectedMode === ScoringMode.Sunforge ? ScoringMode.Sunforge : ScoringMode.Standard
  const inGamePanelId =
    inGameScoreMode === ScoringMode.Sunforge
      ? ScoringPanelId.SunforgeScore
      : ScoringPanelId.StandardScore

  const getNextPanelHandler = (currentPanelId: ScoringPanelId) => {
    const panelOrder = getPanelOrder(selectedMode)
    const currentIndex = panelOrder.indexOf(currentPanelId)

    if (currentIndex !== -1 && currentIndex < panelOrder.length - 1) {
      const nextPanelId = panelOrder[currentIndex + 1]

      return () => onSelectPanel(nextPanelId)
    }

    return undefined
  }

  const getPreviousPanelHandler = (currentPanelId: ScoringPanelId) => {
    const panelOrder = getPanelOrder(selectedMode)
    const currentIndex = panelOrder.indexOf(currentPanelId)

    if (currentIndex > 0) {
      const previousPanelId = panelOrder[currentIndex - 1]

      return () => onSelectPanel(previousPanelId)
    }

    return undefined
  }

  const isFirstPanel = (panelId: ScoringPanelId): boolean => {
    const panelOrder = getPanelOrder(selectedMode)
    const currentIndex = panelOrder.indexOf(panelId)

    return currentIndex === 0
  }

  const isLastPanel = (panelId: ScoringPanelId): boolean => {
    const panelOrder = getPanelOrder(selectedMode)
    const currentIndex = panelOrder.indexOf(panelId)

    return currentIndex === panelOrder.length - 1
  }

  const getPanelProps = (panelId: ScoringPanelId) => ({
    onNext: getNextPanelHandler(panelId),
    onPrevious: getPreviousPanelHandler(panelId),
    isFirstPanel: isFirstPanel(panelId),
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
          selectedPanelId={selectedPanel}
          onModeChange={setSelectedMode}
          onNavigateToSection={onSelectPanel}
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
          <BolgarsBlueprintsPanel
            weeklyChallengeData={weeklyChallengeData}
            {...getPanelProps(ScoringPanelId.BolgarsBlueprints)}
          />
        )}
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} alwaysOnTop />
    </div>
  )
}

export default Scoring
