import { ExtraFilterOption, RarityFilterOption } from '../../types/filters'
import { allFormattingFilters } from '../../hooks/useSearchFilters/useFormattingFilters'
import { UseSearchFilters } from '../../hooks/useSearchFilters'
import { allRarities } from '../../hooks/useSearchFilters/useRarityFilters'
import { allBanners } from '../../hooks/useSearchFilters/useBannerFilters'
import { allExtraFilters } from '../../hooks/useSearchFilters/useExtraFilters'
import { allCardSets } from '../../hooks/useSearchFilters/useCardSetFilters'
import {
  CircleIcon,
  CrossIcon,
  DoubleStarsIcon,
  SingleStarIcon,
  SkullIcon,
  TripleStarsIcon,
} from '../../../shared/utils/icons'
import GradientButton from '../../../shared/components/Buttons/GradientButton'
import ButtonRow from '../../../shared/components/Buttons/ButtonRow'
import CodexLastUpdated from '../CodexLastUpdated'
import PanelHeader from '../PanelHeader'
import { UseCardData } from '../../hooks/useCardData'

import FilterGroup from './FilterGroup'
import WeeklyChallengeButton from './WeeklyChallengeButton'
import styles from './index.module.scss'
import SearchField from './SearchField'

interface SearchPanelProps {
  useSearchFilters: UseSearchFilters
  useCardData: UseCardData
}

const SearchPanel = ({ useSearchFilters, useCardData }: SearchPanelProps) => {
  const {
    keywords,
    setKeywords,
    useCardSetFilters,
    useRarityFilters,
    useBannerFilters,
    useExtraFilters,
    useFormattingFilters,
    resetFilters,
    resetStruckCards,
    setFiltersFromWeeklyChallengeData,
    weeklyChallengeData,
    isWeelyChallengeLoading,
    isWeeklyChallengeError,
  } = useSearchFilters
  const { cardSetFilters, handleCardSetFilterToggle } = useCardSetFilters
  const { rarityFilters, handleRarityFilterToggle } = useRarityFilters
  const { bannerFilters, handleBannerFilterToggle } = useBannerFilters
  const { extraFilters, handleExtraFilterToggle, getExtraFilterName } = useExtraFilters
  const { formattingFilters, handleFormattingFilterToggle, getFormattingFilterName } =
    useFormattingFilters

  const getRarityFilterLabel = (filter: string) => {
    switch (filter) {
      case RarityFilterOption.Legendary:
        return (
          <span className={styles['filter-label']}>
            <TripleStarsIcon className={styles['filter-icon--legendary']} />
            Legendary
          </span>
        )
      case RarityFilterOption.Rare:
        return (
          <span className={styles['filter-label']}>
            <DoubleStarsIcon className={styles['filter-icon--rare']} />
            Rare
          </span>
        )
      case RarityFilterOption.Uncommon:
        return (
          <span className={styles['filter-label']}>
            <SingleStarIcon className={styles['filter-icon--uncommon']} />
            Uncommon
          </span>
        )
      default:
        return (
          <span className={styles['filter-label']}>
            <CircleIcon className={styles['filter-icon--common']} />
            Common
          </span>
        )
    }
  }

  const getExtraFilterLabel = (filter: string) => {
    const name = getExtraFilterName(filter)

    switch (filter) {
      case ExtraFilterOption.IncludeMonsterCards:
        return (
          <span className={styles['filter-label']}>
            <SkullIcon className={styles['filter-icon--monster']} />
            {name}
          </span>
        )
      case ExtraFilterOption.IncludeNonCollectibleCards:
        return (
          <span className={styles['filter-label']}>
            <CrossIcon className={styles['filter-icon--non-collectible']} />
            {name}
          </span>
        )
      default:
        return <span className={styles['filter-label']}>{name}</span>
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
            title="Rarities"
            filters={allRarities}
            selectedFilters={rarityFilters}
            type="rarity"
            onFilterToggle={handleRarityFilterToggle}
            getFilterLabel={getRarityFilterLabel}
          />
          <FilterGroup
            title="Banners"
            filters={allBanners}
            selectedFilters={bannerFilters}
            type="banner"
            onFilterToggle={handleBannerFilterToggle}
          />
          <FilterGroup
            title="Extras"
            filters={allExtraFilters}
            selectedFilters={extraFilters}
            type="extra"
            onFilterToggle={handleExtraFilterToggle}
            getFilterLabel={getExtraFilterLabel}
          />
          <FilterGroup
            title="Formatting"
            filters={allFormattingFilters}
            selectedFilters={formattingFilters}
            type="formatting"
            onFilterToggle={handleFormattingFilterToggle}
            getFilterLabel={getFormattingFilterName}
          />
        </div>

        <ButtonRow align="left" includeBorder className={styles['button-row']}>
          <GradientButton subtle onClick={resetFilters} className={styles['filter-button']}>
            Reset search
          </GradientButton>
          <GradientButton subtle onClick={resetStruckCards} className={styles['filter-button']}>
            Reset tracked cards
          </GradientButton>
        </ButtonRow>

        {(!isWeeklyChallengeError || isWeelyChallengeLoading) && (
          <ButtonRow align="left" className={styles['button-row--weekly-challenge']}>
            <WeeklyChallengeButton
              isLoading={isWeelyChallengeLoading}
              challengeName={weeklyChallengeData?.name}
              challengeId={weeklyChallengeData?.id}
              onClick={setFiltersFromWeeklyChallengeData}
            />
          </ButtonRow>
        )}
      </form>

      <CodexLastUpdated
        lastUpdated={useCardData.lastUpdated}
        isLoading={useCardData.isLoading}
        isLoadingInBackground={useCardData.isLoadingInBackground}
        isErrorInBackground={useCardData.isErrorInBackground}
        progress={useCardData.progress}
        refresh={useCardData.refresh}
      />
    </div>
  )
}

export default SearchPanel
