import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { DeificLarcenyImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { useChallengeData } from './hooks/useChallengeData'
import ScoringGuidePanel from './components/ScoringGuidePanel'
import BlightbaneScorePanel from './components/BlightbaneScorePanel'
import styles from './index.module.scss'
import { GameMode } from './types'
import InGameScorePanel from './components/InGameScorePanel'
import WeeklyChallengePanel from './components/WeeklyChallengePanel'

const cx = createCx(styles)

function useScoringScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 1250 : 1500)
}

function Scoring(): JSX.Element {
  const { resetToScoring } = useNavigation()
  const { showScrollToTopButton, scrollToTop } = useScoringScrollToTop()
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.Standard)

  const inGameScoreMode = selectedMode === GameMode.Sunforge ? GameMode.Sunforge : GameMode.Standard

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToScoring}
        logoSrc={DeificLarcenyImageUrl}
        title="Scoring"
        subtitle="Dawncaster scoring guide"
        currentPage="scoring"
      />

      <div className={cx('content')}>
        <ScoringGuidePanel selectedMode={selectedMode} onModeChange={setSelectedMode} />

        {selectedMode === GameMode.WeeklyChallenge && <WeeklyChallengePanel />}
        <InGameScorePanel
          mode={inGameScoreMode}
          openByDefault={selectedMode !== GameMode.WeeklyChallenge}
        />

        {selectedMode === GameMode.WeeklyChallenge && <BlightbaneScorePanel />}
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} alwaysOnTop />
    </div>
  )
}

export default Scoring
