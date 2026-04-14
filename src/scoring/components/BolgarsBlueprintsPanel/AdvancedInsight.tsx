import GradientLink from '@/shared/components/GradientLink'
import { createCx } from '@/shared/utils/classnames'
import Code from '@/shared/components/Code'

import { FixedValueAction, ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import {
  compareFixedVsKeywordsBonus,
  findCombinationJustAbove,
} from '@/scoring/utils/advancedScoring'

import Highlight from '../Highlight'

import styles from './index.module.scss'

const cx = createCx(styles)

interface AdvancedInsightProps {
  challengeData: WeeklyChallengeData
}

function AdvancedInsight({ challengeData }: AdvancedInsightProps): JSX.Element {
  const { scoring } = challengeData
  const {
    calculationType,
    accuracyBaseValue,
    target,
    buffer,
    cardBaseValue,
    diminishingReturnsLimit,
    keywords,
    fixedValueScoring,
  } = scoring

  if (calculationType !== 'DiminishingReturns') {
    return (
      <div className={cx('unavailable')}>
        <p>
          ⚠️ The score calculation type for this challenge is &quot;
          <strong>{calculationType}</strong>&quot;. This section is not yet supported for that type.
        </p>
      </div>
    )
  }

  const breakTarget = accuracyBaseValue * 0.1
  const pointsPerCardScorings = fixedValueScoring.filter(
    (scoring) => scoring.action === FixedValueAction.PointsPerCard
  )
  const pointsForHavingCardScorings = fixedValueScoring.filter(
    (scoring) => scoring.action === FixedValueAction.DeckContainsCard
  )

  const renderFixedVsKeywordsTips = () => {
    const noFixedScoreFromCards =
      pointsPerCardScorings.length === 0 && pointsForHavingCardScorings.length === 0
    const subHeader = <h4 className={cx('subheader')}>⚖️ &nbsp;Fixed vs Keywords bonus</h4>

    if (noFixedScoreFromCards && cardBaseValue > 0 && keywords.length > 0) {
      return (
        <>
          {subHeader}
          <p>
            No <strong>fixed bonus</strong> cards for this challenge. Collecting the{' '}
            <strong>keywords bonus</strong> cards will be your main source of score, in addition to
            maximizing your <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode
            parameters.
          </p>
        </>
      )
    }

    if (cardBaseValue < 0 || keywords.length === 0) {
      return (
        <>
          {subHeader}
          <p>
            Avoid those negative <strong>keywords bonus</strong> cards! Prioritize the{' '}
            <strong>fixed bonus</strong> cards, and cards that can help you maximize your{' '}
            <Highlight mode={ScoringMode.Standard}>Standard</Highlight> score parameters.
          </p>
        </>
      )
    }

    const comparisons = [...pointsPerCardScorings, ...pointsForHavingCardScorings].map((scoring) =>
      compareFixedVsKeywordsBonus(scoring.pointValue, scoring.keyword, cardBaseValue)
    )

    return (
      <>
        {subHeader}
        {comparisons.map((comparison, index) => {
          if (comparison.outscaledAt === null) {
            return (
              <p key={index} className={cx({ 'follow-up': index > 0 })}>
                The{' '}
                <Highlight mode={ScoringMode.Blightbane} strong>
                  {comparison.fixedPoints}
                </Highlight>{' '}
                <strong>fixed bonus</strong> for{' '}
                <GradientLink
                  text={comparison.cardName}
                  url={`https://blightbane.io/card/${comparison.cardName}`}
                />{' '}
                never gets outscaled by a <strong>keyword</strong> card (even at{' '}
                <Highlight mode={ScoringMode.Blightbane} strong>
                  220%
                </Highlight>{' '}
                <strong>malignancy</strong>).
              </p>
            )
          }

          const rarityLabel = comparison.outscalingRarity
          const malignancyString =
            comparison.outscaledAt > 0 ? (
              <>
                <Highlight mode={ScoringMode.Blightbane} strong>
                  {comparison.outscaledAt}%
                </Highlight>{' '}
                <strong>malignancy</strong>
              </>
            ) : (
              <>
                any <strong>malignancy</strong>
              </>
            )
          return (
            <p key={index}>
              The{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {comparison.fixedPoints}
              </Highlight>{' '}
              <strong>fixed bonus</strong> for{' '}
              <GradientLink
                text={comparison.cardName}
                url={`https://blightbane.io/card/${comparison.cardName}`}
              />{' '}
              gets outscaled by a <strong>{rarityLabel} keyword</strong> card at {malignancyString}.
            </p>
          )
        })}
      </>
    )
  }

  const renderWindowBreakTips = () => {
    const subHeader = <h4 className={cx('subheader')}>🪟 &nbsp;Accuracy Window</h4>

    if (cardBaseValue < 0 || keywords.length === 0 || true) {
      const reason =
        cardBaseValue < 0 ? (
          <>
            Negative <strong>keywords bonus</strong> for this challenge
          </>
        ) : (
          <>
            <strong>No keywords</strong> for this challenge
          </>
        )
      return (
        <>
          {subHeader}
          <p>
            {reason}. There is no reliable way to break past the <strong>accuracy window</strong>{' '}
            and still come out ahead. Advancing the ranks of the two related{' '}
            <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode parameters (
            <strong>🃏 Versatility</strong> and <strong>💰 Wealth</strong>), is by itself usually
            not enough to offset the <strong>accuracy penalty</strong> (unless the window is very
            wide).
          </p>
        </>
      )
    }

    const justAbove = findCombinationJustAbove(
      breakTarget,
      cardBaseValue,
      buffer,
      diminishingReturnsLimit
    )

    return (
      <>
        {subHeader}
        <p>
          For a <strong>net positive score</strong> after breaking the{' '}
          <strong>accuracy window</strong>, you need <em>at least</em>{' '}
          {justAbove && (
            <>
              <Code>
                <strong>{justAbove.combination.description}</strong>
              </Code>{' '}
              <strong>keyword</strong> cards per{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {buffer}
              </Highlight>{' '}
              cards over{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {target}
              </Highlight>
              . This is worth{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {justAbove.totalScore}
              </Highlight>{' '}
              (<Code>{justAbove.combination.calculation}</Code>
              ). Aim for similar or stronger combinations!
            </>
          )}
        </p>
      </>
    )
  }

  return (
    <div className={cx('scoring-container')}>
      <p>
        Additional number-crunching based on the above values. (
        <span className={cx('warning')}> 🧪 experimental feature</span> )
      </p>

      {renderFixedVsKeywordsTips()}

      {renderWindowBreakTips()}
    </div>
  )
}

export default AdvancedInsight
