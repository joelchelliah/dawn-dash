import { Fragment } from 'react/jsx-runtime'

import styles from './index.module.scss'

interface KeywordsSummaryProps {
  matches: string[]
  parsedKeywords: string[]
  showingResultsWithoutKeywords: boolean
  className?: string
}

const KeywordsSummary = ({
  matches,
  parsedKeywords,
  showingResultsWithoutKeywords,
  className,
}: KeywordsSummaryProps) => {
  if (showingResultsWithoutKeywords) {
    return (
      <div className={className}>
        <div className={styles['no-keywords-warning']}>
          Found <strong>{matches.length}</strong> results, matching only the filters!
        </div>
        {matches.length > 0
          ? 'Type something into the search bar to narrow down the result.'
          : 'Try enabling more filters.'}
      </div>
    )
  }

  return (
    <div className={className}>
      Found <strong>{matches.length}</strong> results matching:
      <div className={styles['keywords-summary']}>
        {'[ '}
        {parsedKeywords.map((keyword, index) => {
          const fullMatch = matches.some((match) => match.toLowerCase() === keyword.toLowerCase())
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
