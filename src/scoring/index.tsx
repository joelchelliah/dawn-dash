import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { InfernalContractUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { useChallengeData } from './hooks/useChallengeData'
import ScoringGuidePanel from './components/ScoringGuidePanel'
import GameModeInfoPanel from './components/GameModeInfoPanel'
import BlightbaneScorePanel from './components/BlightbaneScorePanel'
import styles from './index.module.scss'
import { GameMode } from './types'

const cx = createCx(styles)

function useScoringScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 1750 : 1250)
}

function Scoring(): JSX.Element {
  const { resetToScoring } = useNavigation()
  const { challengeData, isLoading, isError } = useChallengeData()
  const { showScrollToTopButton, scrollToTop } = useScoringScrollToTop()
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.Standard)

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToScoring}
        logoSrc={InfernalContractUrl}
        preTitle="Dawn-Dash"
        title="Scoring"
        subtitle="Dawncaster scoring guides"
        currentPage="scoring"
      />

      <div className={cx('content')}>
        <ScoringGuidePanel selectedMode={selectedMode} onModeChange={setSelectedMode} />
        <GameModeInfoPanel mode={selectedMode} />
        <BlightbaneScorePanel
          challengeData={challengeData}
          isLoading={isLoading}
          isError={isError}
        />
      </div>

      <Footer />

      <ScrollToTopButton
        show={showScrollToTopButton && !isLoading && !isError}
        onClick={scrollToTop}
      />
    </div>
  )
}

export default Scoring
