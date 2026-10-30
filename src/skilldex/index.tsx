import dynamic from 'next/dynamic'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { EleganceImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import StarField from '@/shared/components/StarField'
import DataErrorMessage from '@/shared/components/DataErrorMessage'
import DataLoadingMessage from '@/shared/components/DataLoadingMessage'

import { useAllTalentSearchFilters } from './hooks/useSearchFilters/useAllTalentSearchFilters'
import { useTalentData } from './hooks/useTalentData'
import styles from './index.module.scss'

const TalentResultsPanel = dynamic(() => import('./components/TalentResultsPanel'), {
  loading: () => <div>Loading talent tree...</div>,
})

const TalentSearchPanel = dynamic(() => import('./components/TalentSearchPanel'), {
  loading: () => <div>Loading search filters...</div>,
})

const cx = createCx(styles)

function useSkillsScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 1500 : 1000)
}

function Skills(): JSX.Element {
  const { navigateTo } = useNavigation()
  const useTalentDataHook = useTalentData()
  const { talentTree, isLoading, isError, progress } = useTalentDataHook

  const useSearchFiltersHook = useAllTalentSearchFilters(talentTree)
  const { showScrollToTopButton, scrollToTop } = useSkillsScrollToTop()

  return (
    <div className={cx('container')}>
      <StarField position="upper" />
      <StarField position="lower" />
      <Header
        onLogoClick={() => navigateTo('skilldex')}
        logoSrc={EleganceImageUrl}
        title="Skilldex"
        subtitle="Dawncaster talents codex"
        currentPage="skilldex"
      />

      <div className={cx('content')}>
        <DataLoadingMessage isVisible={isLoading} progress={progress} dataType="talent" />
        <DataErrorMessage isVisible={isError && !isLoading} dataType="talent" />
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
