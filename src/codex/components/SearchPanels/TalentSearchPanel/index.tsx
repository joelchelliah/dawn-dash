import Image from '@/shared/components/Image'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import ButtonRow from '@/shared/components/Buttons/ButtonRow'
import { createCx } from '@/shared/utils/classnames'
import {
  ArcanistImageUrl,
  CoinsOfPassingImageUrl,
  DexImageUrl,
  HunterImageUrl,
  InfernalContractUrl,
  IntImageUrl,
  KnightImageUrl,
  NeutralImageUrl,
  RogueImageUrl,
  SeekerImageUrl,
  StrImageUrl,
  SunforgeImageUrl,
  WarriorImageUrl,
  RuneOfPersistenceImageUrl,
  NoSoupImageUrl,
} from '@/shared/utils/imageUrls'

import { allTiers } from '@/codex/hooks/useSearchFilters/useTierFilters'
import { UseAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'
import { allCardSets } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { UseTalentData } from '@/codex/hooks/useTalentData'
import { allFormattingTalentFilters } from '@/codex/hooks/useSearchFilters/useFormattingTalentFilters'
import { RequirementFilterOption } from '@/codex/types/filters'
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
    useFormattingFilters,
    resetFilters,
  } = useSearchFilters
  const { cardSetFilters, handleCardSetFilterToggle } = useCardSetFilters
  const { requirementFilters, handleRequirementFilterToggle, getRequirementFilterName } =
    useRequirementFilters
  const { tierFilters, handleTierFilterToggle } = useTierFilters
  const { formattingFilters, handleFormattingFilterToggle, getFormattingFilterName } =
    useFormattingFilters

  const renderRequirementFilterLabelIcon = (icon: string, alt: string, isClass = false) => (
    <Image
      src={icon}
      alt={alt}
      width={24}
      height={24}
      className={cx('filter-icon', { 'filter-icon--class': isClass })}
    />
  )

  const getRequirementFilterLabel = (filter: string) => {
    const name = getRequirementFilterName(filter)
    const alt = `${name} icon`

    switch (filter) {
      case RequirementFilterOption.NoRequirements:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(NeutralImageUrl, alt)}
            No req...
          </span>
        )
      case RequirementFilterOption.Dexterity:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(DexImageUrl, alt)}
            {name}
          </span>
        )
      case RequirementFilterOption.Intelligence:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(IntImageUrl, alt)}
            {name}
          </span>
        )
      case RequirementFilterOption.Strength:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(StrImageUrl, alt)}
            {name}
          </span>
        )
      case RequirementFilterOption.Arcanist:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(ArcanistImageUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.Hunter:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(HunterImageUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.Knight:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(KnightImageUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.Rogue:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(RogueImageUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.Seeker:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(SeekerImageUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.Warrior:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(WarriorImageUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.Sunforge:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(SunforgeImageUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.ObtainedFromEvents:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(CoinsOfPassingImageUrl, alt, true)}
            Event
          </span>
        )
      case RequirementFilterOption.Offer:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(InfernalContractUrl, alt, true)}
            {name}
          </span>
        )
      case RequirementFilterOption.ObtainedFromCards:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(RuneOfPersistenceImageUrl, alt, true)}
            Card
          </span>
        )
      case RequirementFilterOption.Unavailable:
        return (
          <span className={cx('filter-label')}>
            {renderRequirementFilterLabelIcon(NoSoupImageUrl, alt, true)}
            Unavailable
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
            getFilterLabel={getRequirementFilterLabel}
          />
          <FilterGroup
            title="Tiers"
            filters={allTiers}
            selectedFilters={tierFilters}
            type="tier"
            onFilterToggle={handleTierFilterToggle}
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
