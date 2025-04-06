import { useCallback, useEffect, useState } from 'react'

import cx from 'classnames'
import { useNavigate } from 'react-router-dom'

import Button from '../../components/Buttons/Button'
import ButtonRow from '../../components/Buttons/ButtonRow'
import GradientButton from '../../components/Buttons/GradientButton'
import { useCardData } from '../../hooks/useCardData'
import { useFromNow } from '../../hooks/useFromNow'
import { CardData } from '../../types/cards'
import { CircleIcon, DoubleStarsIcon, SingleStarIcon, TripleStarsIcon } from '../../utils/icons'

import styles from './index.module.scss'

enum Expansion {
  Core = 'Core',
  Metaprogress = 'Metaprogress',
  Metamorphosis = 'Metamorphosis',
  Infinitum = 'Infinitum',
  Catalyst = 'Catalyst',
  Eclypse = 'Eclypse',
}

const defaultExpansionFilters = {
  [Expansion.Core]: true,
  [Expansion.Metaprogress]: false,
  [Expansion.Metamorphosis]: false,
  [Expansion.Infinitum]: false,
  [Expansion.Catalyst]: false,
  [Expansion.Eclypse]: false,
}

const expansionIndicesMap = {
  [Expansion.Core]: [1, 4],
  [Expansion.Metaprogress]: [2],
  [Expansion.Metamorphosis]: [3],
  [Expansion.Infinitum]: [5],
  [Expansion.Catalyst]: [6],
  [Expansion.Eclypse]: [7],
}

const expansionIndexToNameMap = {
  [1]: 'Core',
  [2]: 'Metaprogress',
  [3]: 'Metamorphosis',
  [4]: 'Core',
  [5]: 'Infinitum',
  [6]: 'Catalyst',
  [7]: 'Eclypse',
}

enum Rarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Legendary = 'Legendary',
}

const defaultRarityFilters = {
  [Rarity.Common]: false,
  [Rarity.Uncommon]: false,
  [Rarity.Rare]: true,
  [Rarity.Legendary]: true,
}

const rarityIndexMap = {
  [Rarity.Common]: 0,
  [Rarity.Uncommon]: 1,
  [Rarity.Rare]: 2,
  [Rarity.Legendary]: 3,
}

const rarityIndexToEmojiMap = {
  [0]: '🤎',
  [1]: '💚',
  [2]: '💙',
  [3]: '⭐️',
}

const rarityIndexToIconMap = {
  [0]: <CircleIcon className={styles['rarity-icon--0']} />,
  [1]: <SingleStarIcon className={styles['rarity-icon--1']} />,
  [2]: <DoubleStarsIcon className={styles['rarity-icon--2']} />,
  [3]: <TripleStarsIcon className={styles['rarity-icon--3']} />,
}

enum Banner {
  Green = 'Green',
  Blue = 'Blue',
  Red = 'Red',
  Purple = 'Purple',
  Brown = 'Brown',
  Aqua = 'Aqua',
  Gold = 'Gold',
  Black = 'Black',
  Orange = 'Orange',
}

const defaultBannerFilters = {
  [Banner.Green]: true,
  [Banner.Blue]: true,
  [Banner.Red]: true,
  [Banner.Purple]: true,
  [Banner.Brown]: true,
  [Banner.Aqua]: true,
  [Banner.Gold]: true,
  [Banner.Black]: true,
  [Banner.Orange]: true,
}

const bannerIndexMap = {
  [Banner.Green]: 1,
  [Banner.Blue]: 2,
  [Banner.Red]: 3,
  [Banner.Purple]: 4,
  [Banner.Brown]: 5,
  [Banner.Aqua]: 6,
  [Banner.Gold]: 8,
  [Banner.Black]: 9,
  [Banner.Orange]: 10,
}

// Skip summons, performance, form, hymn, affixes, attunements, ingredients
const excludedCategories = [3, 6, 7, 8, 9, 12, 13, 16]
// Skip other cards that can never be collected
const excludedCards = ['Elite Lightning Bolt', 'Elite Fireball', 'Elite Frostbolt', 'Soulfire Bomb']

function CardCodex(): JSX.Element {
  const navigate = useNavigate()
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

  const resetToDefaults = () => {
    navigate(`misc/codex/cards`, { replace: true })
    window.location.reload()
  }

  const [keywords, setKeywords] = useState('')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const [matchingCards, setMatchingCards] = useState<CardData[]>([])
  const [struckCards, setStruckCards] = useState<Record<string, boolean>>({})

  const [expansionFilters, setExpansionFilters] =
    useState<Record<string, boolean>>(defaultExpansionFilters)
  const [rarityFilters, setRarityFilters] = useState<Record<string, boolean>>(defaultRarityFilters)
  const [bannerFilters, setBannerFilters] = useState<Record<string, boolean>>(defaultBannerFilters)

  const handleExpansionChange = (expansion: string) => {
    setExpansionFilters((prev) => ({
      ...prev,
      [expansion]: !prev[expansion],
    }))
  }

  const handleRarityChange = (rarity: string) => {
    setRarityFilters((prev) => ({
      ...prev,
      [rarity]: !prev[rarity],
    }))
  }

  const handleBannerChange = (banner: string) => {
    setBannerFilters((prev) => ({
      ...prev,
      [banner]: !prev[banner],
    }))
  }

  const toggleCardStrike = (cardName: string) => {
    setStruckCards((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }))
  }

  const resetFilters = () => {
    setKeywords('')
    setParsedKeywords([])
    setExpansionFilters(defaultExpansionFilters)
    setRarityFilters(defaultRarityFilters)
    setBannerFilters(defaultBannerFilters)
    findMatchingCards()
  }

  const findMatchingCards = useCallback(() => {
    const parsed = keywords
      .split(/,\s+or\s+|,\s*|\s+or\s+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    setParsedKeywords(parsed)

    const selectedExpansionIndices = Object.keys(expansionFilters)
      .filter((key) => expansionFilters[key])
      .flatMap((expansion) => expansionIndicesMap[expansion as keyof typeof expansionIndicesMap])
    const selectedRarityIndices = Object.keys(rarityFilters)
      .filter((key) => rarityFilters[key])
      .map((rarity) => rarityIndexMap[rarity as keyof typeof rarityIndexMap])
    const selectedBannerIndices = Object.keys(bannerFilters)
      .filter((key) => bannerFilters[key])
      .map((banner) => bannerIndexMap[banner as keyof typeof bannerIndexMap])

    const filtered = (cardData || [])
      .filter(({ category }) => !excludedCategories.includes(category))
      .filter(({ expansion }) => selectedExpansionIndices.includes(expansion))
      .filter(({ rarity }) => selectedRarityIndices.includes(rarity))
      .filter(({ color }) => selectedBannerIndices.includes(color))
      .filter(
        ({ name }) =>
          !excludedCards.some((excludedCard) => excludedCard.toLowerCase() === name.toLowerCase())
      )
      .filter(({ name, description }) =>
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

    setMatchingCards(filtered)
  }, [bannerFilters, cardData, expansionFilters, keywords, rarityFilters])

  // Find matching cards when keywords or filters change
  useEffect(() => {
    findMatchingCards()
  }, [keywords, expansionFilters, rarityFilters, bannerFilters, findMatchingCards])

  const renderLeftPanel = () => (
    <div className={styles['left-panel']}>
      <h3>🔍 Search</h3>

      <div className={styles['input-container']}>
        <input
          type="text"
          placeholder="Keywords..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              findMatchingCards()
            }
          }}
        />
      </div>

      <div className={styles['filters']}>
        <div className={styles['filter-group']}>
          <h4>Expansions</h4>
          <div className={cx(styles['check-boxes'], styles['expansion-check-boxes'])}>
            {Object.values(Expansion).map((expansion) => (
              <label key={expansion}>
                <input
                  type="checkbox"
                  checked={expansionFilters[expansion]}
                  onChange={() => handleExpansionChange(expansion)}
                />
                {expansion}
              </label>
            ))}
          </div>
        </div>

        <div className={styles['filter-group']}>
          <h4>Rarities</h4>
          <div className={cx(styles['check-boxes'], styles['rarity-check-boxes'])}>
            {Object.values(Rarity).map((rarity) => (
              <label key={rarity}>
                <input
                  type="checkbox"
                  checked={rarityFilters[rarity]}
                  onChange={() => handleRarityChange(rarity)}
                />
                {}
                {rarity}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={styles['filter-group']}>
        <h4>Banners</h4>
        <div className={styles['check-boxes']}>
          {Object.values(Banner).map((banner) => (
            <label key={banner}>
              <input
                type="checkbox"
                checked={bannerFilters[banner]}
                onChange={() => handleBannerChange(banner)}
              />
              {banner}
            </label>
          ))}
        </div>
      </div>

      <ButtonRow align="left">
        <Button onClick={refresh} isLoading={isLoadingInBackground}>
          Resync data
        </Button>

        <Button onClick={resetFilters}>Reset</Button>
        <GradientButton subtle onClick={findMatchingCards}>
          Search
        </GradientButton>
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
                const isStruck = struckCards[card.name]
                const className = cx(styles['result-card'], {
                  [styles['result-card--struck']]: isStruck,
                })

                return (
                  <div
                    key={card.name}
                    className={className}
                    onClick={() => toggleCardStrike(card.name)}
                  >
                    <span className={styles['result-card__rarity']}>
                      {rarityIndexToIconMap[card.rarity as keyof typeof rarityIndexToEmojiMap]}
                    </span>
                    <span className={styles['result-card__name']}>{card.name}</span>
                    <span className={styles['result-card__keywords']}>
                      {findMatchingKeywords(card)}
                    </span>
                    <span className={styles['result-card__expansion']}>
                      {
                        expansionIndexToNameMap[
                          card.expansion as keyof typeof expansionIndexToNameMap
                        ]
                      }
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
        <div className={styles['logo-and-title']} onClick={resetToDefaults}>
          <img
            src="https://blightbane.io/images/icons/cards_metamorphosis_2_48.webp"
            alt="Card Codex Logo"
            className={styles['logo']}
          />
          <div>
            <h1 className={styles['title']}>Codex: Cards</h1>
            <h2 className={styles['subtitle']}>Search, filter & keep track!</h2>
          </div>
        </div>
      </div>

      <div className={styles['content']}>
        {isLoading && (
          <div className={styles['loading']}>
            <div>⏳ Loading delicious card data... Please be patient!</div>
            <div className={styles['loading__progress-container']}>
              <div className={styles['loading__progress-bar']} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles['loading__progress-text']}>{progress}% complete</div>
          </div>
        )}
        {isError && !isLoading && (
          <div className={styles['error']}>💥 Error loading card data... Try again later!</div>
        )}
        {!isError && !isLoading && (
          <>
            {renderLeftPanel()}
            {renderRightPanel()}
          </>
        )}
      </div>
    </div>
  )
}

export default CardCodex
