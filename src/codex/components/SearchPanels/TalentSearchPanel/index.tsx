import { allTiers } from '../../../hooks/useSearchFilters/useTierFilters'
import { UseTalentSearchFilters } from '../../../hooks/useSearchFilters'
import { allCardSets } from '../../../hooks/useSearchFilters/useCardSetFilters'
import GradientButton from '../../../../shared/components/Buttons/GradientButton'
import ButtonRow from '../../../../shared/components/Buttons/ButtonRow'
import CodexLastUpdated from '../../CodexLastUpdated'
import PanelHeader from '../../PanelHeader'
import { UseTalentData } from '../../../hooks/useTalentData'
import FilterGroup from '../shared/FilterGroup'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

interface TalentSearchPanelProps {
  useSearchFilters: UseTalentSearchFilters
  useTalentData: UseTalentData
}

const TalentSearchPanel = ({ useSearchFilters, useTalentData }: TalentSearchPanelProps) => {
  const { keywords, setKeywords, useCardSetFilters, useTierFilters, resetFilters } =
    useSearchFilters
  const { cardSetFilters, handleCardSetFilterToggle } = useCardSetFilters
  const { tierFilters, handleTierFilterToggle } = useTierFilters

  const preventFormSubmission = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <div className={styles['search-panel']}>
      <PanelHeader type="Search" />

      <form onSubmit={preventFormSubmission} aria-label="Card search and filters">
        <SearchField keywords={keywords} setKeywords={setKeywords} />

        <div className={styles['filters']}>
          <FilterGroup
            title="Card Sets"
            filters={allCardSets}
            selectedFilters={cardSetFilters}
            type="card-set"
            onFilterToggle={handleCardSetFilterToggle}
          />
          <FilterGroup
            title="Tiers"
            filters={allTiers}
            selectedFilters={tierFilters}
            type="tier"
            onFilterToggle={handleTierFilterToggle}
          />
        </div>

        <ButtonRow align="left" includeBorder className={styles['button-row']}>
          <GradientButton
            subtle
            onClick={resetFilters}
            className={styles['filter-button']}
            showClickAnimation
          >
            Reset search
          </GradientButton>
        </ButtonRow>
      </form>

      <CodexLastUpdated
        type="talent"
        lastUpdated={useTalentData.lastUpdated}
        isLoading={useTalentData.isLoading}
        isLoadingInBackground={useTalentData.isLoadingInBackground}
        isErrorInBackground={useTalentData.isErrorInBackground}
        progress={useTalentData.progress}
        refresh={useTalentData.refresh}
      />
    </div>
  )
}

export default TalentSearchPanel
