import { createCx } from '../shared/utils/classnames'
import Header from '../shared/components/Header'
import { useNavigation } from '../shared/hooks/useNavigation'
import Footer from '../shared/components/Footer'
import { EleganceImageUrl } from '../shared/utils/imageUrls'

import styles from './skills.module.scss'
import CodexErrorMessage from './components/CodexErrorMessage'
import CodexLoadingMessage from './components/CodexLoadingMessage'
import { useTalentData } from './hooks/useTalentData'
import { useTalentSearchFilters } from './hooks/useSearchFilters'
import TalentSearchPanel from './components/SearchPanels/TalentSearchPanel'
import TalentResultsPanel from './components/ResultsPanels/TalentResultsPanel'

const cx = createCx(styles)

function Skills(): JSX.Element {
  const { resetToTalentCodex } = useNavigation()
  const useTalentDataHook = useTalentData()
  const { talentTree, isLoading, isError, progress } = useTalentDataHook

  const useSearchFiltersHook = useTalentSearchFilters(talentTree)

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
        <CodexLoadingMessage isVisible={isLoading} progress={progress} />
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
    </div>
  )
}

export default Skills
