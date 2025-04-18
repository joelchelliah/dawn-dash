import { useEffect, useRef, useState } from 'react'

import cx from 'classnames'

import WeeklyChallengeButton from '../../codex/components/WeeklyChallengeButton'
import { useWeeklyChallengeFilterData } from '../../codex/hooks/useWeeklyChallengeFilterData'
import GradientDivider from '../../shared/components/GradientDivider'
import {
  isNonCollectibleForRegularExpansions,
  isNonCollectibleForMonsterExpansion,
  parseCardDescription,
  isNonCollectible,
  containsNonCollectible,
} from '../../codex/utils/cardHelper'
import { allExtraFilters, useExtraFilters } from '../../codex/hooks/useExtraFilters'
import { ExtraFilterOption } from '../../codex/types/filters'
import CodexLastUpdated from '../../codex/components/CodexLastUpdated'
import {
  cacheCardCodexSearchFilters,
  getCachedCardCodexSearchFilters,
} from '../../codex/utils/codexFilterStore'
import CodexLoadingMessage from '../../codex/components/CodexLoadingMessage'
import CodexErrorMessage from '../../codex/components/CodexErrorMessage'
import { allFormattingFilters, useFormattingFilters } from '../../codex/hooks/useFormattingFilters'
import { useNavigation } from '../../shared/hooks/useNavigation'
import { isArrayEqual } from '../../shared/utils/lists'
import FilterGroup from '../../codex/components/FilterGroup'
import { useCardStrike } from '../../codex/hooks/useCardStrike'
import { allBanners, useBannerFilters } from '../../codex/hooks/useBannerFilters'
import { useCardSetFilters, allCardSets } from '../../codex/hooks/useCardSetFilters'
import { allRarities, useRarityFilters } from '../../codex/hooks/useRarityFilters'
import Footer from '../../shared/components/Footer'
import { useCardData } from '../../codex/hooks/useCardData'
import { CardData } from '../../codex/types/cards'
import Button from '../../shared/components/Buttons/Button'
import ButtonRow from '../../shared/components/Buttons/ButtonRow'
import {
  CircleIcon,
  CrossIcon,
  SkullIcon,
  DoubleStarsIcon,
  MagnifyingGlassIcon,
  SingleStarIcon,
  StackedCardsIcon,
  TripleStarsIcon,
} from '../../shared/utils/icons'
import Header from '../../shared/components/Header'
import { AbracadabraImageUrl } from '../../shared/utils/imageUrls'

import styles from './index.module.scss'
const indexToRarityIconMap = {
  [0]: <CircleIcon className={styles['rarity-icon--common']} />,
  [1]: <SingleStarIcon className={styles['rarity-icon--uncommon']} />,
  [2]: <DoubleStarsIcon className={styles['rarity-icon--rare']} />,
  [3]: <TripleStarsIcon className={styles['rarity-icon--legendary']} />,
  [4]: <SkullIcon className={styles['rarity-icon--monster']} />,
}

function CardCodex(): JSX.Element {
  const { resetToCardCodex } = useNavigation()

  // Tracking first user interaction on filter to avoid inital cache saves on load
  const hasUserChangedFilter = useRef(false)
  const filterDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    cardData,
    isLoading,
    isLoadingInBackground,
    isError,
    isErrorInBackground,
    lastUpdated,
    refresh,
    progress,
  } = useCardData()
  const { filterData, isFilterDataError, isFilterDataLoading } = useWeeklyChallengeFilterData()

  const cachedFilters = getCachedCardCodexSearchFilters()

  const [keywords, setKeywordsUntracked] = useState(cachedFilters?.keywords || '')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const [matchingCards, setMatchingCards] = useState<CardData[]>([])

  const {
    cardSetFilters,
    isCardSetIndexSelected,
    getCardSetNameFromIndex,
    handleCardSetFilterToggle,
    enableAllCardSetFilters,
    enableSpecificCardSetFilters,
    resetCardSetFilters,
  } = useCardSetFilters(cachedFilters?.cardSets)
  const { rarityFilters, isRarityIndexSelected, handleRarityFilterToggle, resetRarityFilters } =
    useRarityFilters(cachedFilters?.rarities)
  const {
    bannerFilters,
    isBannerIndexSelected,
    handleBannerFilterToggle,
    enableAllBannerFilters,
    enableSpecificBannerFilters,
    resetBannerFilters,
  } = useBannerFilters(cachedFilters?.banners)
  const {
    extraFilters,
    handleExtraFilterToggle,
    getExtraFilterName,
    resetExtraFilters,
    shouldIncludeMonsterCards,
    shouldIncludeNonCollectibleCards,
  } = useExtraFilters(cachedFilters?.extras)
  const {
    formattingFilters,
    handleFormattingFilterToggle,
    getFormattingFilterName,
    resetFormattingFilters,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
    shouldShowRarity,
  } = useFormattingFilters(cachedFilters?.formatting)
  const {
    struckCards,
    isCardStruck,
    toggleCardStrike: toggleCardStrikeUntracked,
    resetStruckCards,
  } = useCardStrike(cachedFilters?.struckCards)

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // ------ to avoid initial cache saves on load ------
  // --------------------------------------------------
  const setKeywords = (keywords: string) => {
    hasUserChangedFilter.current = true
    setKeywordsUntracked(keywords)
  }
  const toggleCardSetFilter = (cardSet: string) => {
    hasUserChangedFilter.current = true
    handleCardSetFilterToggle(cardSet)
  }
  const toggleRarityFilter = (rarity: string) => {
    hasUserChangedFilter.current = true
    handleRarityFilterToggle(rarity)
  }
  const toggleBannerFilter = (banner: string) => {
    hasUserChangedFilter.current = true
    handleBannerFilterToggle(banner)
  }
  const toggleExtraFilter = (extra: string) => {
    hasUserChangedFilter.current = true
    handleExtraFilterToggle(extra)
  }
  const toggleFormattingFilter = (formatting: string) => {
    hasUserChangedFilter.current = true
    handleFormattingFilterToggle(formatting)
  }
  const toggleCardStrike = (card: CardData) => {
    hasUserChangedFilter.current = true
    toggleCardStrikeUntracked(card)
  }
  // --------------------------------------------------
  // --------------------------------------------------

  const setFiltersFromWeeklyChallengeData = () => {
    if (filterData && !isFilterDataError) {
      hasUserChangedFilter.current = true
      setKeywords(
        Array.from(
          new Set([...Array.from(filterData.keywords), ...Array.from(filterData.specialKeywords)])
        ).join(', ')
      )

      if (filterData.isBoundless) {
        enableAllCardSetFilters()
        enableAllBannerFilters()
      } else {
        enableSpecificCardSetFilters(Array.from(filterData.cardSets))
        enableSpecificBannerFilters(Array.from(filterData.banners))
      }
    }
  }

  const resetFilters = () => {
    setKeywords('')
    setParsedKeywords([])
    resetCardSetFilters()
    resetRarityFilters()
    resetBannerFilters()
    resetExtraFilters()
    resetFormattingFilters()
  }

  useEffect(() => {
    const parsed = keywords
      .split(/,\s+or\s+|,\s*|\s+or\s+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    if (!isArrayEqual(parsed, parsedKeywords)) {
      setParsedKeywords(parsed)
    }

    if (cardData) {
      const monsterExpansion = 0
      const monsterRarity = 4
      const monsterBanner = 11
      const filteredCards = cardData
        .filter(({ expansion }) =>
          expansion === monsterExpansion
            ? shouldIncludeMonsterCards
            : isCardSetIndexSelected(expansion)
        )
        .filter(({ rarity }) =>
          rarity === monsterRarity ? shouldIncludeMonsterCards : isRarityIndexSelected(rarity)
        )
        .filter(({ color }) =>
          color === monsterBanner ? shouldIncludeMonsterCards : isBannerIndexSelected(color)
        )
        .filter((card) => {
          if (card.expansion !== monsterExpansion) {
            return shouldIncludeNonCollectibleCards || !isNonCollectibleForRegularExpansions(card)
          }
          if (isNonCollectibleForMonsterExpansion(card)) {
            return shouldIncludeNonCollectibleCards && shouldIncludeMonsterCards
          }
          return true
        })
        .filter(
          ({ name, description }) =>
            parsed.length === 0 ||
            parsed.some(
              (keyword) =>
                name.toLowerCase().includes(keyword.toLowerCase()) ||
                description.toLowerCase().includes(keyword.toLowerCase())
            )
        )

      if (!isArrayEqual(filteredCards, matchingCards, 'name')) {
        setMatchingCards(filteredCards)
      }
    }
  }, [
    parsedKeywords,
    matchingCards,
    cardData,
    keywords,
    isCardSetIndexSelected,
    isRarityIndexSelected,
    isBannerIndexSelected,
    shouldIncludeMonsterCards,
    shouldIncludeNonCollectibleCards,
  ])

  useEffect(() => {
    if (!hasUserChangedFilter.current) return

    if (filterDebounceTimeoutRef.current) {
      clearTimeout(filterDebounceTimeoutRef.current)
    }

    // Debounced caching of filters
    filterDebounceTimeoutRef.current = setTimeout(() => {
      cacheCardCodexSearchFilters({
        keywords,
        cardSets: cardSetFilters,
        rarities: rarityFilters,
        banners: bannerFilters,
        extras: extraFilters,
        formatting: formattingFilters,
        struckCards,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [
    bannerFilters,
    cardSetFilters,
    extraFilters,
    formattingFilters,
    keywords,
    rarityFilters,
    struckCards,
  ])

  const preventFormSubmission = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  const getRarityFilterLabel = (filter: string) => {
    switch (filter) {
      case 'Legendary':
        return (
          <span className={styles['filter-label']}>
            <TripleStarsIcon className={styles['filter-icon--legendary']} />
            Legendary
          </span>
        )
      case 'Rare':
        return (
          <span className={styles['filter-label']}>
            <DoubleStarsIcon className={styles['filter-icon--rare']} />
            Rare
          </span>
        )
      case 'Uncommon':
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

  const renderLeftPanel = () => (
    <div className={styles['left-panel']}>
      <div className={styles['panel-header']}>
        <MagnifyingGlassIcon className={styles['panel-header__magnifying-glass-icon']} />
        <span className={styles['panel-header__title']}>Search</span>
      </div>
      <GradientDivider spacingBottom="lg" />

      <form onSubmit={preventFormSubmission} aria-label="Card search and filters">
        <div className={styles['input-container']}>
          <input
            type="text"
            placeholder="Keywords, separated, by, comma"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            aria-label="Search keywords"
          />
        </div>

        <div className={styles['filters']}>
          <FilterGroup
            title="Card Sets"
            filters={allCardSets}
            selectedFilters={cardSetFilters}
            type="card-set"
            onFilterToggle={toggleCardSetFilter}
          />
          <FilterGroup
            title="Rarities"
            filters={allRarities}
            selectedFilters={rarityFilters}
            type="rarity"
            onFilterToggle={toggleRarityFilter}
            getFilterLabel={getRarityFilterLabel}
          />
          <FilterGroup
            title="Banners"
            filters={allBanners}
            selectedFilters={bannerFilters}
            type="banner"
            onFilterToggle={toggleBannerFilter}
          />
          <FilterGroup
            title="Extras"
            filters={allExtraFilters}
            selectedFilters={extraFilters}
            type="extra"
            onFilterToggle={toggleExtraFilter}
            getFilterLabel={getExtraFilterLabel}
          />
          <FilterGroup
            title="Formatting"
            filters={allFormattingFilters}
            selectedFilters={formattingFilters}
            type="formatting"
            onFilterToggle={toggleFormattingFilter}
            getFilterLabel={getFormattingFilterName}
          />
        </div>

        <ButtonRow align="left" includeBorder>
          <Button onClick={resetFilters} type="button">
            Reset search
          </Button>
          <Button onClick={resetStruckCards} type="button">
            Reset tracked cards
          </Button>
        </ButtonRow>

        {(!isFilterDataError || isFilterDataLoading) && (
          <ButtonRow align="left">
            <WeeklyChallengeButton
              isLoading={isFilterDataLoading}
              challengeName={filterData?.name}
              onClick={setFiltersFromWeeklyChallengeData}
            />
          </ButtonRow>
        )}
      </form>

      <CodexLastUpdated
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isLoadingInBackground={isLoadingInBackground}
        isErrorInBackground={isErrorInBackground}
        progress={progress}
        refresh={refresh}
      />
    </div>
  )

  const findMatchingKeywords = (card: CardData) => {
    const matches = parsedKeywords.filter(
      (keyword) =>
        card.name.toLowerCase().includes(keyword.toLowerCase()) ||
        card.description.toLowerCase().includes(keyword.toLowerCase())
    )

    return `{ ${matches.join(', ')} }`
  }

  const renderMatchingCards = () => {
    if (parsedKeywords.length === 0) return null

    const cardsByBanner = matchingCards.reduce(
      (acc, card) => {
        acc[card.color] = [...(acc[card.color] || []), card]
        return acc
      },
      {} as Record<number, CardData[]>
    )

    return (
      <div className={styles['results-container']} key={parsedKeywords.join(',')}>
        <div className={styles['results-info']}>
          <strong>Found {matchingCards.length} cards matching: </strong>
          <div
            className={styles['results-info__keywords']}
          >{`[ ${parsedKeywords.join(', ')} ]`}</div>
        </div>

        {Object.entries(cardsByBanner).map(([banner, cards]) => (
          <div key={banner} className={styles['results-cards']}>
            <div className={styles[`results-cards__banner--${banner}`]}>
              {cards.map((card) => {
                const className = cx(styles['result-card-container'], {
                  [styles['result-card-container--struck']]: isCardStruck(card),
                })

                return (
                  <div className={className} key={card.name} onClick={() => toggleCardStrike(card)}>
                    <div className={styles['result-card']}>
                      {shouldShowRarity && (
                        <span className={styles['result-card__rarity']}>
                          {indexToRarityIconMap[card.rarity as keyof typeof indexToRarityIconMap]}
                        </span>
                      )}
                      {shouldIncludeNonCollectibleCards &&
                        containsNonCollectible(matchingCards) && (
                          <span className={styles['result-card__non-collectible']}>
                            {isNonCollectible(card) && <CrossIcon />}
                          </span>
                        )}
                      <span className={styles['result-card__name']}>{card.name}</span>
                      {shouldShowKeywords && (
                        <span className={styles['result-card__keywords']}>
                          {findMatchingKeywords(card)}
                        </span>
                      )}
                      {shouldShowCardSet && (
                        <span className={styles['result-card__card-set']}>
                          {getCardSetNameFromIndex(card.expansion)}
                        </span>
                      )}
                    </div>
                    {shouldShowDescription && (
                      <div className={styles['result-card__description']}>
                        {parseCardDescription(card.description)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderRightPanel = () => (
    <div className={styles['right-panel']}>
      <div className={styles['panel-header']}>
        <StackedCardsIcon className={styles['panel-header__cards-icon']} />
        <span className={styles['panel-header__title']}>Results</span>
      </div>
      <GradientDivider spacingBottom="lg" />
      {renderMatchingCards()}
    </div>
  )

  return (
    <div className={styles['container']}>
      <Header
        onLogoClick={resetToCardCodex}
        logoSrc={AbracadabraImageUrl}
        title="Dawn-Dash : Cardex"
        subtitle="Dawncaster card search & filter"
        currentPage="cardex"
      />

      <div className={styles['content']}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} />
        <CodexErrorMessage isVisible={isError && !isLoading} />
        {!isError && !isLoading && (
          <>
            {renderLeftPanel()}
            {renderRightPanel()}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default CardCodex
