import { useTalentSearchFilters } from '../codex/hooks/useSearchFilters'
import TalentSearchPanel from '../codex/components/SearchPanels/TalentSearchPanel'
import { EleganceImageUrl } from '../shared/utils/imageUrls'
import Header from '../shared/components/Header'
import { useNavigation } from '../shared/hooks/useNavigation'
import { useTalentData } from '../codex/hooks/useTalentData'
import CodexLoadingMessage from '../codex/components/CodexLoadingMessage'
import CodexErrorMessage from '../codex/components/CodexErrorMessage'

import styles from './skills.module.scss'

function Skills(): JSX.Element {
  const { resetToTalentCodex } = useNavigation()
  const useTalentDataHook = useTalentData()
  const { talentData, isLoading, isError, progress } = useTalentDataHook

  const useSearchFiltersHook = useTalentSearchFilters(talentData)

  return (
    <div className={styles['container']}>
      <Header
        onLogoClick={resetToTalentCodex}
        logoSrc={EleganceImageUrl}
        title="Dawn-Dash : Skilldex"
        subtitle="Dawncaster talents codex"
        currentPage="skilldex"
      />

      <div className={styles['content']}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} />
        <CodexErrorMessage isVisible={isError && !isLoading} />
        {!isError && !isLoading && (
          <>
            <TalentSearchPanel
              useSearchFilters={useSearchFiltersHook}
              useTalentData={useTalentDataHook}
            />
            {/* <ResultsPanel useSearchFilters={useSearchFiltersHook} /> */}
          </>
        )}
      </div>
    </div>
  )
}

export default Skills
