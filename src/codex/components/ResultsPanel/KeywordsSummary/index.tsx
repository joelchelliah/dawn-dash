import { Fragment } from 'react/jsx-runtime'

import { CardData } from '../../../types/cards'

import styles from './index.module.scss'

interface KeywordsSummaryProps {
  matchingCards: CardData[]
  parsedKeywords: string[]
  showingCardsWithoutKeywords: boolean
  className?: string
}

const KeywordsSummary = ({
  matchingCards,
  parsedKeywords,
  showingCardsWithoutKeywords,
  className,
}: KeywordsSummaryProps) => {
  if (showingCardsWithoutKeywords) {
    return (
      <div className={className}>
        <div className={styles['no-keywords-warning']}>
          Found <strong>{matchingCards.length}</strong> cards, matching only the filters!
        </div>
        {matchingCards.length > 0
          ? 'Type something into the search bar to narrow down the result.'
          : 'Try enabling more filters.'}
      </div>
    )
  }

  return (
    <div className={className}>
      Found <strong>{matchingCards.length}</strong> cards matching:
      <div className={styles['keywords-summary']}>
        {'[ '}
        {parsedKeywords.map((keyword, index) => {
          const fullMatch = matchingCards.some(
            ({ name }) => name.toLowerCase() === keyword.toLowerCase()
          )

          const className = fullMatch ? styles['keywords-summary__full-match'] : ''

          return (
            <Fragment key={keyword}>
              <span className={className}>{keyword}</span>
              <span>{index < parsedKeywords.length - 1 && ', '}</span>
            </Fragment>
          )
        })}
        {` ]`}
      </div>
    </div>
  )
}

export default KeywordsSummary
