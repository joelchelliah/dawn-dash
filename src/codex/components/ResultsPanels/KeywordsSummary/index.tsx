import { Fragment } from 'react/jsx-runtime'

import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface KeywordsSummaryProps {
  matches: string[]
  struckCards?: string[]
  parsedKeywords: string[]
  showingResultsWithoutKeywords: boolean
  className?: string
}

const KeywordsSummary = ({
  matches,
  struckCards = [],
  parsedKeywords,
  showingResultsWithoutKeywords,
  className,
}: KeywordsSummaryProps) => {
  if (showingResultsWithoutKeywords) {
    return (
      <div className={className}>
        <div className={cx('no-keywords-warning')}>
          Found <strong>{matches.length}</strong> results, matching only the filters!
        </div>
        {matches.length > 0
          ? 'Type something into the search bar to narrow down the result.'
          : 'Try enabling more filters.'}
      </div>
    )
  }

  const renderMatchesCountText = () => {
    const resultsStr = matches.length === 1 ? 'result' : 'results'

    return (
      <span>
        Found <strong>{matches.length}</strong> {resultsStr} matching:
      </span>
    )
  }

  const renderStruckCountText = () => {
    const struckCount = matches.filter((match) => struckCards.includes(match)).length

    if (struckCount === 0) {
      return null
    }

    return (
      <div>
        You have marked <strong>{struckCount}</strong> of these cards as tracked.
      </div>
    )
  }

  return (
    <div className={className}>
      {renderMatchesCountText()}
      <div className={cx('keywords-summary')}>
        {'[ '}
        {parsedKeywords.map((keyword, index) => {
          const fullMatch = matches.some((match) => match.toLowerCase() === keyword.toLowerCase())
          const className = cx({
            'keywords-summary__full-match': fullMatch,
          })

          return (
            <Fragment key={keyword}>
              <span className={className}>{keyword}</span>
              <span>{index < parsedKeywords.length - 1 && ', '}</span>
            </Fragment>
          )
        })}
        {` ]`}
      </div>
      <div className={cx('keywords-tracked')}>{renderStruckCountText()}</div>
    </div>
  )
}

export default KeywordsSummary
