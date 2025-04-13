import { useEffect, useRef, useState } from 'react'

import cx from 'classnames'

import {
  cacheCardCodexSearchFilters,
  getCachedCardCodexSearchFilters,
} from '../../codex/utils/codexFilterStore'
import GradientLink from '../../shared/components/GradientLink'
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
import { useFromNow } from '../../shared/hooks/useFromNow'
import {
  CircleIcon,
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
}

// Skip summons, performance, form, hymn, affixes, attunements, ingredients
const excludedCategories = [3, 6, 7, 8, 9, 12, 13, 16]
// Skip other cards that can never be collected
const excludedCards = ['Elite Lightning Bolt', 'Elite Fireball', 'Elite Frostbolt', 'Soulfire Bomb']

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
  const fromNow = useFromNow(lastUpdated, 'Card data synced')
  const cachedFilters = getCachedCardCodexSearchFilters()

  const [keywords, setKeywordsUntracked] = useState(cachedFilters?.keywords || '')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const [matchingCards, setMatchingCards] = useState<CardData[]>([])

  const {
    cardSetFilters,
    isCardSetIndexSelected,
    getCardSetNameFromIndex,
    handleCardSetFilterToggle,
    resetCardSetFilters,
  } = useCardSetFilters(cachedFilters?.cardSets)
  const { rarityFilters, isRarityIndexSelected, handleRarityFilterToggle, resetRarityFilters } =
    useRarityFilters(cachedFilters?.rarities)
  const { bannerFilters, isBannerIndexSelected, handleBannerFilterToggle, resetBannerFilters } =
    useBannerFilters(cachedFilters?.banners)
  const {
    formattingFilters,
    handleFormattingFilterToggle,
    getFormattingFilterName,
    resetFormattingFilters,
    shouldShowRarity,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
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

  const resetFilters = () => {
    setKeywords('')
    setParsedKeywords([])
    resetCardSetFilters()
    resetRarityFilters()
    resetBannerFilters()
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
      const filteredCards = cardData
        .filter(({ category }) => !excludedCategories.includes(category))
        .filter(({ expansion }) => isCardSetIndexSelected(expansion))
        .filter(({ rarity }) => isRarityIndexSelected(rarity))
        .filter(({ color }) => isBannerIndexSelected(color))
        .filter(
          ({ name }) =>
            !excludedCards.some((excludedCard) => excludedCard.toLowerCase() === name.toLowerCase())
        )
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
  }, [bannerFilters, cardSetFilters, formattingFilters, keywords, rarityFilters, struckCards])

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

  const renderLeftPanel = () => (
    <div className={styles['left-panel']}>
      <div className={styles['panel-header']}>
        <MagnifyingGlassIcon />
        Search
      </div>

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
            title="Results formatting"
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
      </form>

      <div
        className={cx(styles['last-updated'], {
          [styles['last-updated--loading']]: isLoadingInBackground,
          [styles['last-updated--error']]: isErrorInBackground,
        })}
      >
        {isLoadingInBackground ? (
          <>
            <div>⏳ Syncing card data: {progress}%</div>
            <div className={styles['last-updated__progress-container']}>
              <div
                className={styles['last-updated__progress-bar']}
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : isErrorInBackground ? (
          <div>💥 Error syncing card data... Try again later!</div>
        ) : (
          fromNow
        )}
        {!(isLoading || isLoadingInBackground) && (
          <div>
            <GradientLink text="Resync data?" onClick={refresh} />
          </div>
        )}
      </div>
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

  const cleanUpDescription = (description: string) =>
    description
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>?/g, '')
      .replace(/\[\[/g, '[') // Replace [[ with [
      .replace(/\]\]/g, ']') // Replace ]] with ]
      .replace(/\(\[/g, '(') // Replace ([ with (
      .replace(/\(\{/g, '(') // Replace ({ with (
      .replace(/\]\)/g, ')') // Replace ]) with )
      .replace(/\}\)/g, ')') // Replace }) with )
      .replace(/\n+/g, '\n')
      .trim()

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
                        {cleanUpDescription(card.description)}
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
        <StackedCardsIcon />
        Results
      </div>
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
