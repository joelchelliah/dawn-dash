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
import { allCardSets } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import DataLastUpdated from '@/shared/components/DataLastUpdated'
import PanelHeader from '@/shared/components/PanelHeader'
import FilterGroup from '@/shared/components/FilterGroup'
import IconFilterLabel from '@/shared/components/FilterGroup/IconFilterLabel'
import SearchField from '@/shared/components/SearchField'

import { allTiers } from '@/skilldex/hooks/useSearchFilters/useTierFilters'
import { UseAllTalentSearchFilters } from '@/skilldex/hooks/useSearchFilters/useAllTalentSearchFilters'
import { UseTalentData } from '@/skilldex/hooks/useTalentData'
import { allFormattingTalentFilters } from '@/skilldex/hooks/useSearchFilters/useFormattingTalentFilters'
import { RequirementFilterOption } from '@/skilldex/types/talentFilters'
import { allRequirements } from '@/skilldex/hooks/useSearchFilters/useRequirementFilters'

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
    parsedKeywords,
    matchingTalentNames,
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

  const getRequirementFilterLabel = (filter: string) => {
    const name = getRequirementFilterName(filter)
    const alt = `${name} icon`

    switch (filter) {
      case RequirementFilterOption.NoRequirements:
        return (
          <IconFilterLabel icon={NeutralImageUrl} alt={alt}>
            No require...
          </IconFilterLabel>
        )
      case RequirementFilterOption.Dexterity:
        return (
          <IconFilterLabel icon={DexImageUrl} alt={alt}>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Intelligence:
        return (
          <IconFilterLabel icon={IntImageUrl} alt={alt}>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Strength:
        return (
          <IconFilterLabel icon={StrImageUrl} alt={alt}>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Arcanist:
        return (
          <IconFilterLabel icon={ArcanistImageUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Hunter:
        return (
          <IconFilterLabel icon={HunterImageUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Knight:
        return (
          <IconFilterLabel icon={KnightImageUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Rogue:
        return (
          <IconFilterLabel icon={RogueImageUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Seeker:
        return (
          <IconFilterLabel icon={SeekerImageUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Warrior:
        return (
          <IconFilterLabel icon={WarriorImageUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.Sunforge:
        return (
          <IconFilterLabel icon={SunforgeImageUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.ObtainedFromEvents:
        return (
          <IconFilterLabel icon={CoinsOfPassingImageUrl} alt={alt} isClass>
            Event
          </IconFilterLabel>
        )
      case RequirementFilterOption.Offer:
        return (
          <IconFilterLabel icon={InfernalContractUrl} alt={alt} isClass>
            {name}
          </IconFilterLabel>
        )
      case RequirementFilterOption.ObtainedFromCards:
        return (
          <IconFilterLabel icon={RuneOfPersistenceImageUrl} alt={alt} isClass>
            Card
          </IconFilterLabel>
        )
      case RequirementFilterOption.Unavailable:
        return (
          <IconFilterLabel icon={NoSoupImageUrl} alt={alt} isClass>
            Unavailable
          </IconFilterLabel>
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
        <SearchField
          keywords={keywords}
          setKeywords={setKeywords}
          parsedKeywords={parsedKeywords}
          matches={matchingTalentNames}
        />

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

      <DataLastUpdated
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
