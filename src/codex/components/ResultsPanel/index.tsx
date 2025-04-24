import { useEffect, useState } from 'react'

import cx from 'classnames'

import {
  containsNonCollectible,
  isFullMatch,
  isNonCollectible,
  parseCardDescription,
} from '../../utils/cardHelper'
import {
  CircleIcon,
  SingleStarIcon,
  DoubleStarsIcon,
  TripleStarsIcon,
  SkullIcon,
  CrossIcon,
} from '../../../shared/utils/icons'
import GradientButton from '../../../shared/components/Buttons/GradientButton'
import { CardData } from '../../types/cards'
import { UseSearchFilters } from '../../hooks/useSearchFilters'
import PanelHeader from '../PanelHeader'

import styles from './index.module.scss'
import KeywordsSummary from './KeywordsSummary'

interface ResultsPanelProps {
  useSearchFilters: UseSearchFilters
}

const indexToRarityIconMap = {
  [0]: <CircleIcon className={styles['rarity-icon--common']} />,
  [1]: <SingleStarIcon className={styles['rarity-icon--uncommon']} />,
  [2]: <DoubleStarsIcon className={styles['rarity-icon--rare']} />,
  [3]: <TripleStarsIcon className={styles['rarity-icon--legendary']} />,
  [4]: <SkullIcon className={styles['rarity-icon--monster']} />,
}

const ResultsPanel = ({ useSearchFilters }: ResultsPanelProps) => {
  const [showCardsWithoutKeywords, setShowCardsWithoutKeywords] = useState(false)
  const {
    parsedKeywords,
    matchingCards,
    useCardSetFilters,
    useExtraFilters,
    useFormattingFilters,
    useCardStrike,
  } = useSearchFilters
  const { getCardSetNameFromIndex } = useCardSetFilters
  const { shouldIncludeNonCollectibleCards } = useExtraFilters
  const { shouldShowRarity, shouldShowDescription, shouldShowKeywords, shouldShowCardSet } =
    useFormattingFilters
  const { isCardStruck, toggleCardStrike } = useCardStrike

  useEffect(() => {
    if (parsedKeywords.length > 0) {
      setShowCardsWithoutKeywords(false)
    }
  }, [parsedKeywords])

  const findMatchingKeywords = (card: CardData) => {
    const matches = parsedKeywords.filter(
      (keyword) =>
        card.name.toLowerCase().includes(keyword.toLowerCase()) ||
        card.description.toLowerCase().includes(keyword.toLowerCase())
    )

    return `{ ${matches.join(', ')} }`
  }

  const renderMatchingCards = () => {
    const showingCardsWithoutKeywords = parsedKeywords.length === 0 && showCardsWithoutKeywords
    const cardsByBanner = matchingCards.reduce(
      (acc, card) => {
        acc[card.color] = [...(acc[card.color] || []), card]
        return acc
      },
      {} as Record<number, CardData[]>
    )

    return (
      <div className={styles['results-container']} key={parsedKeywords.join(',')}>
        <KeywordsSummary
          matchingCards={matchingCards}
          parsedKeywords={parsedKeywords}
          showingCardsWithoutKeywords={showingCardsWithoutKeywords}
          className={styles['results-container__info']}
        />

        {Object.entries(cardsByBanner).map(([banner, cards]) => (
          <div key={banner} className={styles['results-cards']}>
            <div className={styles[`results-cards__banner--${banner}`]}>
              {cards.map((card) => {
                const fullMatch = parsedKeywords.some((keyword) => isFullMatch(card, keyword))
                const className = cx(styles['result-card-container'], {
                  [styles['result-card-container--struck']]: isCardStruck(card),
                  [styles['result-card-container--full-match']]: fullMatch,
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
                      {shouldShowKeywords && !showCardsWithoutKeywords && (
                        <span className={styles['result-card__keywords']}>
                          {findMatchingKeywords(card)}
                        </span>
                      )}
                      {shouldShowCardSet && (
                        <span className={styles['result-card__card-set']}>
                          {getCardSetNameFromIndex(card.expansion) ?? '-'}
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

  return (
    <div className={styles['results-panel']}>
      <PanelHeader type="Results" />

      {parsedKeywords.length > 0 || showCardsWithoutKeywords ? (
        renderMatchingCards()
      ) : (
        <div className={styles['results-container']}>
          <div className={styles['results-container__info']}>
            No <strong>keywords</strong> have been provided yet. Type something into the search bar,
            or...
          </div>

          <GradientButton
            className={styles['results-container__no-keywords-button']}
            subtle
            onClick={() => setShowCardsWithoutKeywords(true)}
          >
            Show <strong>all card</strong> matching
            <br />
            only the filters
          </GradientButton>
        </div>
      )}
    </div>
  )
}

export default ResultsPanel
