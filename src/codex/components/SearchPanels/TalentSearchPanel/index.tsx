import GradientButton from '@/shared/components/Buttons/GradientButton'
import ButtonRow from '@/shared/components/Buttons/ButtonRow'

import { allTiers } from '@/codex/hooks/useSearchFilters/useTierFilters'
import { UseTalentSearchFilters } from '@/codex/hooks/useSearchFilters'
import { allCardSets } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { UseTalentData } from '@/codex/hooks/useTalentData'
import { allTalentExtraFilters } from '@/codex/hooks/useSearchFilters/useTalentExtraFilters'

import CodexLastUpdated from '../../CodexLastUpdated'
import PanelHeader from '../../PanelHeader'
import FilterGroup from '../shared/FilterGroup'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

interface TalentSearchPanelProps {
  useSearchFilters: UseTalentSearchFilters
  useTalentData: UseTalentData
}

const TalentSearchPanel = ({ useSearchFilters, useTalentData }: TalentSearchPanelProps) => {
  const {
    keywords,
    setKeywords,
    useCardSetFilters,
    useTierFilters,
    useTalentExtraFilters,
    resetFilters,
  } = useSearchFilters
  const { cardSetFilters, handleCardSetFilterToggle } = useCardSetFilters
  const { tierFilters, handleTierFilterToggle } = useTierFilters
  const { talentExtraFilters, handleTalentExtraFilterToggle, getTalentExtraFilterName } =
    useTalentExtraFilters

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
          <FilterGroup
            title="Extras (TODO!)"
            filters={allTalentExtraFilters}
            selectedFilters={talentExtraFilters}
            type="extra"
            onFilterToggle={handleTalentExtraFilterToggle}
            // TODO: Add filter labels
            getFilterLabel={(filter) => getTalentExtraFilterName(filter)}
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
