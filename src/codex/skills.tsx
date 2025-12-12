import { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { EleganceImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import Notification from '@/shared/components/Notification'

import CodexErrorMessage from './components/CodexErrorMessage'
import CodexLoadingMessage from './components/CodexLoadingMessage'
import { useAllTalentSearchFilters } from './hooks/useSearchFilters'
import { useTalentData } from './hooks/useTalentData'
import styles from './skills.module.scss'

const TalentResultsPanel = dynamic(() => import('./components/ResultsPanels/TalentResultsPanel'), {
  loading: () => <div>Loading talent tree...</div>,
})

const TalentSearchPanel = dynamic(() => import('./components/SearchPanels/TalentSearchPanel'), {
  loading: () => <div>Loading search filters...</div>,
})

const cx = createCx(styles)

function Skills(): JSX.Element {
  const { resetToTalentCodex } = useNavigation()
  const useTalentDataHook = useTalentData()
  const { talentTree, isLoading, isError, progress } = useTalentDataHook

  const useSearchFiltersHook = useAllTalentSearchFilters(talentTree)
  const { showButton, scrollToTop } = useScrollToTop()
  const { isTabletOrSmaller } = useBreakpoint()
  const { shouldUseMobileFriendlyRendering } = useSearchFiltersHook.useFormattingFilters

  const [showMobileRenderingNotification, setShowMobileRenderingNotification] = useState(false)
  useEffect(() => {
    // Only show notification if on mobile/tablet AND mobile-friendly rendering is disabled
    if (isTabletOrSmaller && !shouldUseMobileFriendlyRendering) {
      setShowMobileRenderingNotification(true)
    }
  }, [shouldUseMobileFriendlyRendering, isTabletOrSmaller])

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToTalentCodex}
        logoSrc={EleganceImageUrl}
        title="Dawn-Dash : Skilldex"
        subtitle="Dawncaster talents codex"
        currentPage="skilldex"
      />

      <div className={cx('content')}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} codexType="talent" />
        <CodexErrorMessage isVisible={isError && !isLoading} />
        {!isError && !isLoading && (
          <>
            <TalentSearchPanel
              useSearchFilters={useSearchFiltersHook}
              useTalentData={useTalentDataHook}
            />

            <TalentResultsPanel useSearchFilters={useSearchFiltersHook} />

            <Notification
              message={
                <span>
                  📱 Mobile-rendering <strong>disabled</strong>! This is not recommended for most
                  mobile devices.
                </span>
              }
              isTriggered={showMobileRenderingNotification}
              onClose={() => setShowMobileRenderingNotification(false)}
            />
          </>
        )}
      </div>

      <Footer />

      <ScrollToTopButton show={showButton && !isLoading && !isError} onClick={scrollToTop} />
    </div>
  )
}

export default Skills
