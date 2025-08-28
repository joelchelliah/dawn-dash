import GradientButton from '@/shared/components/Buttons/GradientButton'
import ButtonRow from '@/shared/components/Buttons/ButtonRow'
import { createCx } from '@/shared/utils/classnames'
import { FlameIcon, ScrollIcon } from '@/shared/utils/icons'

import { allTiers } from '@/codex/hooks/useSearchFilters/useTierFilters'
import { UseAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'
import { allCardSets } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { UseTalentData } from '@/codex/hooks/useTalentData'
import { allExtraTalentFilters } from '@/codex/hooks/useSearchFilters/useExtraTalentFilters'
import { allFormattingTalentFilters } from '@/codex/hooks/useSearchFilters/useFormattingTalentFilters'
import { ExtraTalentFilterOption } from '@/codex/types/filters'
import { allRequirements } from '@/codex/hooks/useSearchFilters/useRequirementFilters'

import CodexLastUpdated from '../../CodexLastUpdated'
import PanelHeader from '../../PanelHeader'
import FilterGroup from '../shared/FilterGroup'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TalentSearchPanelProps {
  useSearchFilters: UseAllTalentSearchFilters
  useTalentData: UseTalentData
}

const TalentSearchPanel = ({ useSearchFilters, useTalentData }: TalentSearchPanelProps) => {
  const {
    keywords,
    setKeywords,
    useCardSetFilters,
    useRequirementFilters,
    useTierFilters,
    useExtraTalentFilters,
    useFormattingFilters,
    resetFilters,
  } = useSearchFilters
  const { cardSetFilters, handleCardSetFilterToggle } = useCardSetFilters
  const { requirementFilters, handleRequirementFilterToggle } = useRequirementFilters
  const { tierFilters, handleTierFilterToggle } = useTierFilters
  const { extraTalentFilters, handleExtraTalentFilterToggle, getExtraTalentFilterName } =
    useExtraTalentFilters
  const { formattingFilters, handleFormattingFilterToggle, getFormattingFilterName } =
    useFormattingFilters

  const getExtraFilterLabel = (filter: string) => {
    const name = getExtraTalentFilterName(filter)

    switch (filter) {
      case ExtraTalentFilterOption.IncludeOffers:
        return (
          <span className={cx('filter-label')}>
            <ScrollIcon className={cx('filter-icon--scroll')} />
            {name}
          </span>
        )
      case ExtraTalentFilterOption.IncludeEvents:
        return (
          <span className={cx('filter-label')}>
            <FlameIcon className={cx('filter-icon--flame')} />
            {name}
          </span>
        )
      default:
        return <span className={cx('filter-label')}>{name}</span>
    }
  }

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
            title="Base requirements"
            filters={allRequirements}
            selectedFilters={requirementFilters}
            type="requirement"
            onFilterToggle={handleRequirementFilterToggle}
          />
          <FilterGroup
            title="Tiers"
            filters={allTiers}
            selectedFilters={tierFilters}
            type="tier"
            onFilterToggle={handleTierFilterToggle}
          />
          <FilterGroup
            title="Extras"
            filters={allExtraTalentFilters}
            selectedFilters={extraTalentFilters}
            type="extra"
            onFilterToggle={handleExtraTalentFilterToggle}
            getFilterLabel={getExtraFilterLabel}
          />
          <FilterGroup
            title="Results formatting"
            filters={allFormattingTalentFilters}
            selectedFilters={formattingFilters}
            type="formatting-talent"
            onFilterToggle={handleFormattingFilterToggle}
            getFilterLabel={getFormattingFilterName}
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
