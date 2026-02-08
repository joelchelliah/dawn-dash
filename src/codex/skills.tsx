import dynamic from 'next/dynamic'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { EleganceImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'

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

function useSkillsScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 1500 : 1000)
}

function Skills(): JSX.Element {
  const { resetToTalentCodex } = useNavigation()
  const useTalentDataHook = useTalentData()
  const { talentTree, isLoading, isError, progress } = useTalentDataHook

  const useSearchFiltersHook = useAllTalentSearchFilters(talentTree)
  const { showScrollToTopButton, scrollToTop } = useSkillsScrollToTop()

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToTalentCodex}
        logoSrc={EleganceImageUrl}
        preTitle="Dawn-Dash"
        title="Skilldex"
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
          </>
        )}
      </div>

      <Footer />

      <ScrollToTopButton
        show={showScrollToTopButton && !isLoading && !isError}
        onClick={scrollToTop}
      />
    </div>
  )
}

export default Skills
