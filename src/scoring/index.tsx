import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { PestilenceDecreeUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import StarField from '@/shared/components/StarField'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import ScoringGuidePanel from './components/ScoringGuidePanel'
import { getPanelOrder } from './components/ContentNavigation'
import BlightbaneScorePanel from './components/BlightbaneScorePanel'
import styles from './index.module.scss'
import { PanelNavigationProps, ScoringMode, ScoringPanelId } from './types'
import InGameScorePanel from './components/InGameScorePanel'
import WeeklyChallengePanel from './components/WeeklyChallengePanel'
import { useUrlParams } from './hooks/useUrlParams'
import ExamplesPanel from './components/ExamplesPanel'
import BolgarsBlueprintsPanel from './components/BolgarsBlueprintsPanel'
import { useWeeklyChallengeData } from './hooks/useWeeklyChallengeData'
import { useSelectedPanel } from './hooks/useSelectedPanel'

const cx = createCx(styles)

function useScoringScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 1250 : 1500)
}

function Scoring(): JSX.Element {
  const { navigateTo } = useNavigation()
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

  const getPanelProps = (panelId: ScoringPanelId): PanelNavigationProps => {
    const panelOrder = getPanelOrder(selectedMode)
    const index = panelOrder.indexOf(panelId)
    const hasPrevious = index > 0
    const hasNext = index !== -1 && index < panelOrder.length - 1

    return {
      panelId,
      isFirstPanel: index === 0,
      isLastPanel: index === panelOrder.length - 1,
      onPrevious: hasPrevious ? () => onSelectPanel(panelOrder[index - 1]) : undefined,
      onNext: hasNext ? () => onSelectPanel(panelOrder[index + 1]) : undefined,
    }
  }

  return (
    <div className={cx('container')}>
      <StarField position="upper" />
      <StarField position="lower" />
      <Header
        onLogoClick={() => navigateTo('scoring')}
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
          <BlightbaneScorePanel
            onNavigateToPanel={onSelectPanel}
            {...getPanelProps(ScoringPanelId.BlightbaneScore)}
          />
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
