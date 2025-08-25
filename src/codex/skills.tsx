import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { EleganceImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'

import TalentResultsPanel from './components/ResultsPanels/TalentResultsPanel'
import TalentSearchPanel from './components/SearchPanels/TalentSearchPanel'
import CodexErrorMessage from './components/CodexErrorMessage'
import CodexLoadingMessage from './components/CodexLoadingMessage'
import { useAllTalentSearchFilters } from './hooks/useSearchFilters'
import { useTalentData } from './hooks/useTalentData'
import styles from './skills.module.scss'

const cx = createCx(styles)

function Skills(): JSX.Element {
  const { resetToTalentCodex } = useNavigation()
  const useTalentDataHook = useTalentData()
  const { talentTree, isLoading, isError, progress } = useTalentDataHook

  const useSearchFiltersHook = useAllTalentSearchFilters(talentTree)

  const { showButton, scrollToTop } = useScrollToTop({
    thresholdPixels: 750,
  })

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToTalentCodex}
        logoSrc={EleganceImageUrl}
        title="Dawn-Dash : Skilldex"
        subtitle="Dawncaster talents codex"
        currentPage="skilldex"
      />

      <div className={cx('work-in-progress')}> WORK IN PROGRESS . . .</div>

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

      <ScrollToTopButton show={showButton && !isLoading && !isError} onClick={scrollToTop} />
    </div>
  )
}

export default Skills
