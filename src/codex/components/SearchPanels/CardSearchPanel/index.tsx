import { createCx } from '../../../../shared/utils/classnames'
import { ExtraFilterOption, RarityFilterOption } from '../../../types/filters'
import { allFormattingFilters } from '../../../hooks/useSearchFilters/useFormattingFilters'
import { UseCardSearchFilters } from '../../../hooks/useSearchFilters'
import { allRarities } from '../../../hooks/useSearchFilters/useRarityFilters'
import { allBanners } from '../../../hooks/useSearchFilters/useBannerFilters'
import { allExtraFilters } from '../../../hooks/useSearchFilters/useExtraFilters'
import { allCardSets } from '../../../hooks/useSearchFilters/useCardSetFilters'
import {
  CircleIcon,
  CrossIcon,
  DoubleStarsIcon,
  SingleStarIcon,
  SkullIcon,
  TripleStarsIcon,
} from '../../../../shared/utils/icons'
import GradientButton from '../../../../shared/components/Buttons/GradientButton'
import ButtonRow from '../../../../shared/components/Buttons/ButtonRow'
import CodexLastUpdated from '../../CodexLastUpdated'
import PanelHeader from '../../PanelHeader'
import { UseCardData } from '../../../hooks/useCardData'
import FilterGroup from '../shared/FilterGroup'
import WeeklyChallengeButton from '../shared/WeeklyChallengeButton'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

interface CardSearchPanelProps {
  useSearchFilters: UseCardSearchFilters
  useCardData: UseCardData
}

const CardSearchPanel = ({ useSearchFilters, useCardData }: CardSearchPanelProps) => {
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
          <span className={cx('filter-label')}>
            <TripleStarsIcon className={cx('filter-icon--legendary')} />
            Legendary
          </span>
        )
      case RarityFilterOption.Rare:
        return (
          <span className={cx('filter-label')}>
            <DoubleStarsIcon className={cx('filter-icon--rare')} />
            Rare
          </span>
        )
      case RarityFilterOption.Uncommon:
        return (
          <span className={cx('filter-label')}>
            <SingleStarIcon className={cx('filter-icon--uncommon')} />
            Uncommon
          </span>
        )
      default:
        return (
          <span className={cx('filter-label')}>
            <CircleIcon className={cx('filter-icon--common')} />
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
          <span className={cx('filter-label')}>
            <SkullIcon className={cx('filter-icon--monster')} />
            {name}
          </span>
        )
      case ExtraFilterOption.IncludeNonCollectibleCards:
        return (
          <span className={cx('filter-label')}>
            <CrossIcon className={cx('filter-icon--non-collectible')} />
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
    <div className={cx('search-panel')}>
      <PanelHeader type="Search" />

      <form onSubmit={preventFormSubmission} aria-label="Card search and filters">
        <SearchField keywords={keywords} setKeywords={setKeywords} />

        <div className={cx('filters')}>
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

        <ButtonRow align="left" includeBorder className={cx('button-row')}>
          <GradientButton
            subtle
            onClick={resetFilters}
            className={cx('filter-button')}
            showClickAnimation
          >
            Reset search
          </GradientButton>
          <GradientButton
            subtle
            onClick={resetStruckCards}
            className={cx('filter-button', 'filter-button--fill-width')}
            showClickAnimation
          >
            Reset tracked cards
          </GradientButton>
        </ButtonRow>

        {(!isWeeklyChallengeError || isWeelyChallengeLoading) && (
          <ButtonRow align="left" className={cx('button-row--weekly-challenge')}>
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
        type="card"
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

export default CardSearchPanel
