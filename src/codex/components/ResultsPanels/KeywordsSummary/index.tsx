import { Fragment, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'

import { useCardStrike } from '../../../hooks/useSearchFilters/useCardStrike'

import styles from './index.module.scss'

const cx = createCx(styles)

interface KeywordsSummaryProps {
  matches: string[]
  useCardStrike?: ReturnType<typeof useCardStrike>
  parsedKeywords: string[]
  showingResultsWithoutKeywords: boolean
  shouldHideTrackedCards?: boolean
  className?: string
}

const KeywordsSummary = ({
  matches,
  useCardStrike,
  parsedKeywords,
  showingResultsWithoutKeywords,
  shouldHideTrackedCards = false,
  className,
}: KeywordsSummaryProps) => {
  const [undoTrackedAnimationKey, setUndoTrackedAnimationKey] = useState(0)

  const handleUndoLastTrackedCard = () => {
    if (useCardStrike?.undoLastTrackedCard) {
      useCardStrike.undoLastTrackedCard()
      setUndoTrackedAnimationKey((prev) => prev + 1)
    }
  }
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
    if (!useCardStrike) {
      return null
    }

    const { struckCards, lastUndoneTrackedCard } = useCardStrike
    const struckCount = matches.filter((match) => struckCards.includes(match)).length
    const struckHiddenInfo = shouldHideTrackedCards ? (
      <div>
        <span className={cx('keywords-tracked__hidden-info')}>
          Your tracked cards will be hidden.
        </span>
        <br />
        {struckCount > 0 && (
          <GradientLink text="Undo last tracked card?" onClick={handleUndoLastTrackedCard} />
        )}
        {lastUndoneTrackedCard && (
          <span
            key={undoTrackedAnimationKey}
            className={cx('keywords-tracked__untracked-info', {
              'keywords-tracked__untracked-info--last-one-undone': struckCount === 0,
            })}
          >
            {' '}
            Untracked: <strong>{lastUndoneTrackedCard}</strong>
          </span>
        )}
      </div>
    ) : null

    if (struckCount === 0) {
      return struckHiddenInfo
    }

    return (
      <div>
        You have marked <strong>{struckCount}</strong> of these cards as{' '}
        <s>
          <strong>tracked</strong>
        </s>
        .{struckHiddenInfo}
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
