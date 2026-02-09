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
  resultType?: string
}

const KeywordsSummary = ({
  matches,
  useCardStrike,
  parsedKeywords,
  showingResultsWithoutKeywords,
  shouldHideTrackedCards = false,
  className,
  resultType = 'result',
}: KeywordsSummaryProps) => {
  const [undoTrackedAnimationKey, setUndoTrackedAnimationKey] = useState(0)
  const hasParsedKeywords = parsedKeywords.length > 0

  const handleUndoLastTrackedCard = () => {
    if (useCardStrike?.undoLastTrackedCard) {
      useCardStrike.undoLastTrackedCard()
      setUndoTrackedAnimationKey((prev) => prev + 1)
    }
  }

  const renderMatchesCountText = () => {
    if (showingResultsWithoutKeywords) {
      return (
        <>
          <div className={cx('no-keywords-warning')}>
            Found <strong>{matches.length}</strong> results, matching only the filters!
          </div>
          <span className={cx('no-keywords-hint')}>
            {matches.length > 0
              ? 'Type something into the search bar to narrow down the result.'
              : 'Try enabling more filters.'}
          </span>
        </>
      )
    }

    const resultsStr = matches.length === 1 ? resultType : `${resultType}s`

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

    const trackedInfoContainerClassName = cx('keywords-tracked__info-container', {
      'keywords-tracked__info-container--hidden': shouldHideTrackedCards,
    })

    if (struckCount === 0) {
      return <div className={trackedInfoContainerClassName}>{struckHiddenInfo}</div>
    }

    return (
      <div className={trackedInfoContainerClassName}>
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
        {hasParsedKeywords && '[ '}
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
        {hasParsedKeywords && ` ]`}
      </div>
      <div className={cx('keywords-tracked')}>{renderStruckCountText()}</div>
    </div>
  )
}

export default KeywordsSummary
