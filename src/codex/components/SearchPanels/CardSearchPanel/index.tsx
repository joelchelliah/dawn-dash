import { useEffect, useMemo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import {
  CircleIcon,
  CrossIcon,
  DoubleStarsIcon,
  PawIcon,
  SingleStarIcon,
  SkullIcon,
  TripleStarsIcon,
} from '@/shared/components/Icons'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import ButtonRow from '@/shared/components/Buttons/ButtonRow'
import Notification from '@/shared/components/Notification'

import { ExtraCardFilterOption, RarityFilterOption } from '@/codex/types/filters'
import {
  UseAllCardSearchFilters,
  WeeklyChallengeNotification,
} from '@/codex/hooks/useSearchFilters/useAllCardSearchFilters'
import { allFormattingCardFilters } from '@/codex/hooks/useSearchFilters/useFormattingCardFilters'
import { allRarities } from '@/codex/hooks/useSearchFilters/useRarityFilters'
import { allBanners } from '@/codex/hooks/useSearchFilters/useBannerFilters'
import {
  allCardTypes,
  getCardTypeEmojiFromName,
} from '@/codex/hooks/useSearchFilters/useCardTypeFilters'
import { allExtraCardFilters } from '@/codex/hooks/useSearchFilters/useExtraCardFilters'
import { allCardSets } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { UseCardData } from '@/codex/hooks/useCardData'

import CodexLastUpdated from '../../CodexLastUpdated'
import PanelHeader from '../../PanelHeader'
import FilterGroup from '../shared/FilterGroup'
import WeeklyChallengeButton from '../shared/WeeklyChallengeButton'
import SearchField from '../shared/SearchField'

import styles from './index.module.scss'

const cx = createCx(styles)

interface CardSearchPanelProps {
  useSearchFilters: UseAllCardSearchFilters
  useCardData: UseCardData
}

const CardSearchPanel = ({ useSearchFilters, useCardData }: CardSearchPanelProps) => {
  const {
    keywords,
    setKeywords,
    parsedKeywords,
    matchingCards,
    useCardSetFilters,
    useRarityFilters,
    useBannerFilters,
    useCardTypeFilters,
    useExtraCardFilters,
    useFormattingFilters,
    resetFilters,
    resetStruckCards,
    setFiltersFromWeeklyChallengeData,
    weeklyChallengeData,
    isWeelyChallengeLoading,
    isWeeklyChallengeError,
    weeklyChallengeNotification,
    clearWeeklyChallengeNotification,
  } = useSearchFilters
  const { cardSetFilters, handleCardSetFilterToggle } = useCardSetFilters
  const { rarityFilters, handleRarityFilterToggle } = useRarityFilters
  const { bannerFilters, handleBannerFilterToggle } = useBannerFilters
  const { cardTypeFilters, handleCardTypeFilterToggle } = useCardTypeFilters
  const { extraCardFilters, handleExtraCardFilterToggle, getExtraCardFilterName } =
    useExtraCardFilters
  const { formattingFilters, handleFormattingFilterToggle, getFormattingFilterName } =
    useFormattingFilters

  // Memoized because the matching set can run to thousands of cards, and only the names are needed.
  const matchingCardNames = useMemo(() => matchingCards.map((card) => card.name), [matchingCards])

  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState<React.ReactNode>(null)

  const renderNotificationMessage = (icon: string, text: React.ReactNode) => (
    <div className={cx('notification-message')}>
      <strong className={cx('notification-message__title')}>Optimized for Weekly!</strong>
      <div className={cx('notification-message__divider')} />
      <div className={cx('notification-message__icon')}>{icon}</div>
      <div className={cx('notification-message__text')}>{text}</div>
    </div>
  )
  const untrackedCardsNotificationMessage = renderNotificationMessage(
    '🔍',
    <>
      You have <strong>tracked cards</strong> from your last search! Clear them with «
      <strong>Reset tracked cards</strong>».
    </>
  )
  const specialKeywordRulesNotificationMessage = renderNotificationMessage(
    '📝',
    <>
      A <strong>rarity level</strong> is used as a keyword in this challenge! All cards of this{' '}
      <strong>rarity</strong> will be scored.
    </>
  )
  const negativeKeywordsNotificationMessage = renderNotificationMessage(
    '🧼',
    <>
      Keywords with a <strong>negative</strong> score have been filtered out by the optimization!
    </>
  )
  const weeklyChallengeNotificationMessages: Record<WeeklyChallengeNotification, React.ReactNode> =
    {
      untrackedCards: untrackedCardsNotificationMessage,
      specialKeywordRules: specialKeywordRulesNotificationMessage,
      negativeKeywords: negativeKeywordsNotificationMessage,
    }

  useEffect(() => {
    if (!weeklyChallengeNotification) return

    setNotificationMessage(weeklyChallengeNotificationMessages[weeklyChallengeNotification])
    setShowNotification(true)
    clearWeeklyChallengeNotification()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyChallengeNotification])

  const handleCloseNotification = () => {
    setNotificationMessage(null)
    setShowNotification(false)
  }

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
      case RarityFilterOption.Common:
        return (
          <span className={cx('filter-label')}>
            <CircleIcon className={cx('filter-icon--common')} />
            Common
          </span>
        )
    }

    return <span className={cx('filter-label')}>{filter}</span>
  }

  const getCardTypeFilterLabel = (filter: string) => {
    const emoji = getCardTypeEmojiFromName(filter)
    if (!emoji) return <span className={cx('filter-label')}>{filter}</span>

    return (
      <span className={cx('filter-label')}>
        <span className={cx('filter-emoji')}>{emoji}</span>
        {filter}
      </span>
    )
  }

  const getExtraFilterLabel = (filter: string) => {
    const name = getExtraCardFilterName(filter)

    switch (filter) {
      case ExtraCardFilterOption.IncludeMonsterCards:
        return (
          <span className={cx('filter-label')}>
            <SkullIcon className={cx('filter-icon--monster')} />
            {name}
          </span>
        )
      case ExtraCardFilterOption.IncludeAnimalCompanionCards:
        return (
          <span className={cx('filter-label')}>
            <PawIcon className={cx('filter-icon--animal-companion')} />
            {name}
          </span>
        )
      case ExtraCardFilterOption.IncludeNonCollectibleCards:
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

  const renderWeeklyChallengeButton = () => {
    if (isWeeklyChallengeError && !isWeelyChallengeLoading) return null

    return (
      <ButtonRow align="left" className={cx('button-row--weekly-challenge')}>
        <WeeklyChallengeButton
          isLoading={isWeelyChallengeLoading}
          challengeName={weeklyChallengeData?.name}
          challengeId={weeklyChallengeData?.id}
          onClick={setFiltersFromWeeklyChallengeData}
        />
      </ButtonRow>
    )
  }

  return (
    <div className={cx('search-panel')}>
      <PanelHeader type="Search" />

      <form onSubmit={preventFormSubmission} aria-label="Card search and filters">
        <SearchField
          keywords={keywords}
          setKeywords={setKeywords}
          parsedKeywords={parsedKeywords}
          matches={matchingCardNames}
        />

        <div className={cx('filters')}>
          <FilterGroup
            title="Card Sets"
            filters={allCardSets}
            selectedFilters={cardSetFilters}
            type="card-set"
            onFilterToggle={handleCardSetFilterToggle}
          />
          <FilterGroup
            title="Banners"
            filters={allBanners}
            selectedFilters={bannerFilters}
            type="banner"
            onFilterToggle={handleBannerFilterToggle}
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
            title="Types"
            filters={allCardTypes}
            selectedFilters={cardTypeFilters}
            type="card-type"
            onFilterToggle={handleCardTypeFilterToggle}
            getFilterLabel={getCardTypeFilterLabel}
          />
          <FilterGroup
            title="Extras"
            filters={allExtraCardFilters}
            selectedFilters={extraCardFilters}
            type="extra"
            onFilterToggle={handleExtraCardFilterToggle}
            getFilterLabel={getExtraFilterLabel}
            className={cx('filters__extras')}
          />
          <FilterGroup
            title="Results formatting"
            filters={allFormattingCardFilters}
            selectedFilters={formattingFilters}
            type="formatting-card"
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

        {renderWeeklyChallengeButton()}
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

      <Notification
        duration={5000}
        isTriggered={showNotification}
        onClose={handleCloseNotification}
        message={notificationMessage}
        alignCloseButtonTop
      />
    </div>
  )
}

export default CardSearchPanel
