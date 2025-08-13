import { useEffect, useState } from 'react'

import GradientButton from '@/shared/components/Buttons/GradientButton'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'
import { UseCardSearchFilters } from '@/codex/hooks/useSearchFilters'

import KeywordsSummary from '../KeywordsSummary'
import PanelHeader from '../../PanelHeader'

import ResultCard from './ResultCard'
import styles from './index.module.scss'

interface CardResultsPanelProps {
  useSearchFilters: UseCardSearchFilters
}

const cx = createCx(styles)

const CardResultsPanel = ({ useSearchFilters }: CardResultsPanelProps) => {
  const [showCardsWithoutKeywords, setShowCardsWithoutKeywords] = useState(false)
  const { parsedKeywords, matchingCards } = useSearchFilters

  useEffect(() => {
    if (parsedKeywords.length > 0) {
      setShowCardsWithoutKeywords(false)
    }
  }, [parsedKeywords])

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
      <div className={cx('results-container')} key={parsedKeywords.join(',')}>
        <KeywordsSummary
          matches={matchingCards.map((card) => card.name)}
          parsedKeywords={parsedKeywords}
          showingResultsWithoutKeywords={showingCardsWithoutKeywords}
          className={cx('results-container__info')}
        />

        {Object.entries(cardsByBanner).map(([banner, cards]) => (
          <div key={banner} className={cx('results-cards')}>
            <div className={cx(`results-cards__banner--${banner}`)}>
              {cards.map((card) => (
                <ResultCard
                  key={card.name}
                  card={card}
                  useSearchFilters={useSearchFilters}
                  showCardsWithoutKeywords={showCardsWithoutKeywords}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="Results" />

      {parsedKeywords.length > 0 || showCardsWithoutKeywords ? (
        renderMatchingCards()
      ) : (
        <div className={cx('results-container')}>
          <div className={cx('results-container__info')}>
            No <strong>keywords</strong> have been provided yet. Do you want to see all cards
            matching only the filters?
          </div>

          <GradientButton
            className={cx('results-container__no-keywords-button')}
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

export default CardResultsPanel
