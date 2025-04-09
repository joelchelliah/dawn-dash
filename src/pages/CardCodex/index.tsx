import { useEffect, useState } from 'react'

import cx from 'classnames'

import CodexLoadingMessage from '../../codex/components/CodexLoadingMessage'
import CodexErrorMessage from '../../codex/components/CodexErrorMessage'
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
  SingleStarIcon,
  TripleStarsIcon,
} from '../../shared/utils/icons'

import styles from './index.module.scss'

const indexToRarityIconMap = {
  [0]: <CircleIcon className={styles['rarity-icon--0']} />,
  [1]: <SingleStarIcon className={styles['rarity-icon--1']} />,
  [2]: <DoubleStarsIcon className={styles['rarity-icon--2']} />,
  [3]: <TripleStarsIcon className={styles['rarity-icon--3']} />,
}

// Skip summons, performance, form, hymn, affixes, attunements, ingredients
const excludedCategories = [3, 6, 7, 8, 9, 12, 13, 16]
// Skip other cards that can never be collected
const excludedCards = ['Elite Lightning Bolt', 'Elite Fireball', 'Elite Frostbolt', 'Soulfire Bomb']

function CardCodex(): JSX.Element {
  const { resetToCardCodex } = useNavigation()
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

  const [keywords, setKeywords] = useState('')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const [matchingCards, setMatchingCards] = useState<CardData[]>([])

  const {
    cardSetFilters,
    isCardSetIndexSelected,
    getCardSetNameFromIndex,
    handleCardSetFilterToggle,
    resetCardSetFilters,
  } = useCardSetFilters()
  const { rarityFilters, isRarityIndexSelected, handleRarityFilterToggle, resetRarityFilters } =
    useRarityFilters()
  const { bannerFilters, isBannerIndexSelected, handleBannerFilterToggle, resetBannerFilters } =
    useBannerFilters()
  const { isCardStruck, toggleCardStrike, resetStruckCards } = useCardStrike()

  const resetFilters = () => {
    setKeywords('')
    setParsedKeywords([])
    resetCardSetFilters()
    resetRarityFilters()
    resetBannerFilters()
    resetStruckCards()
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
        .sort((a, b) => {
          if (a.color !== b.color) {
            return a.color - b.color
          }
          if (a.rarity !== b.rarity) {
            return b.rarity - a.rarity
          }
          return a.name.localeCompare(b.name)
        })
        .filter((card, index, self) => index === self.findIndex(({ name }) => name === card.name))

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

  const renderLeftPanel = () => (
    <div className={styles['left-panel']}>
      <h3>🔍 Search</h3>

      <div className={styles['input-container']}>
        <input
          type="text"
          placeholder="Keywords..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
      </div>

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
        />
        <FilterGroup
          title="Banners"
          filters={allBanners}
          selectedFilters={bannerFilters}
          type="banner"
          onFilterToggle={handleBannerFilterToggle}
        />
      </div>

      <ButtonRow align="left">
        <Button onClick={refresh} isLoading={isLoadingInBackground}>
          Resync data
        </Button>

        <Button onClick={resetFilters}>Reset</Button>
      </ButtonRow>

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
                const className = cx(styles['result-card'], {
                  [styles['result-card--struck']]: isCardStruck(card),
                })

                return (
                  <div key={card.name} className={className} onClick={() => toggleCardStrike(card)}>
                    <span className={styles['result-card__rarity']}>
                      {indexToRarityIconMap[card.rarity as keyof typeof indexToRarityIconMap]}
                    </span>
                    <span className={styles['result-card__name']}>{card.name}</span>
                    <span className={styles['result-card__keywords']}>
                      {findMatchingKeywords(card)}
                    </span>
                    <span className={styles['result-card__card-set']}>
                      {getCardSetNameFromIndex(card.expansion)}
                    </span>
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
      <div className={styles['results-title']}>
        <h3>🃏 Results</h3>
        <span>( Monster cards not included )</span>
      </div>
      {renderMatchingCards()}
    </div>
  )

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <div className={styles['logo-and-title']} onClick={resetToCardCodex}>
          <img
            src="https://blightbane.io/images/icons/cards_metamorphosis_2_48.webp"
            alt="Cardex Logo"
            className={styles['logo']}
          />
          <div>
            <h1 className={styles['title']}>Dawn-Dash : Cardex</h1>
            <h2 className={styles['subtitle']}>Dawncaster card search & filter</h2>
          </div>
        </div>
      </div>

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
