import GradientLink from '@/shared/components/GradientLink'
import { createCx } from '@/shared/utils/classnames'
import Code from '@/shared/components/Code'

import { FixedValueAction, ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import {
  calculateCardEquivalentToGivenPoints,
  compareFixedVsKeywordsBonus,
  findCombinationJustAbove,
  findHighestVersatilityRankInRange,
  getAccuracyWindowRange,
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

  const renderStandardParametersTips = () => {
    const versatilityRankResults = findHighestVersatilityRankInRange(target, buffer)
    const windowRange = getAccuracyWindowRange(target, buffer)

    const versatilityTips = versatilityRankResults && (
      <p className={cx('insight-paragraph', 'follow-up')}>
        The highest achievable <strong>Versatility</strong> rank within the{' '}
        <strong>accuracy window</strong> (<Code>{windowRange}</Code>) is{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          {versatilityRankResults.rank}
        </Highlight>
        , by passing the threshold of{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          {versatilityRankResults.threshold}
        </Highlight>{' '}
        cards. This is worth{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          {versatilityRankResults.additionalPoints}
        </Highlight>{' '}
        points{' '}
        {versatilityRankResults.rankBelow ? (
          <>
            more than rank{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {versatilityRankResults.rankBelow}
            </Highlight>
          </>
        ) : (
          ''
        )}
        .
      </p>
    )

    const equivalent = calculateCardEquivalentToGivenPoints(500, cardBaseValue, false)

    const maxRankTips = (
      <p className={cx('insight-paragraph')}>
        The additional{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          500
        </Highlight>{' '}
        points for advancing from rank{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          VIII
        </Highlight>{' '}
        to{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          XI
        </Highlight>{' '}
        in <strong>Damage</strong>, <strong>Awareness</strong> or <strong>Wealth</strong> parameter,
        is worth{' '}
        <Code>
          <strong>{equivalent}</strong>
        </Code>{' '}
        <strong>keyword</strong> card(s).
      </p>
    )

    return (
      <>
        {cardBaseValue > 0 && keywords.length > 0 && maxRankTips}
        {versatilityTips}
      </>
    )
  }

  const renderFixedVsKeywordsTips = () => {
    const positivePointsScorings = [
      ...pointsPerCardScorings,
      ...pointsForHavingCardScorings,
    ].filter((scoring) => scoring.pointValue > 0)
    if (positivePointsScorings.length === 0 || cardBaseValue < 0 || keywords.length === 0) {
      return <p className={cx('insight-paragraph')}>-</p>
    }

    const comparisons = [...pointsPerCardScorings, ...pointsForHavingCardScorings]
      .filter((scoring) => scoring.pointValue > 0)
      .map((scoring) =>
        compareFixedVsKeywordsBonus(scoring.pointValue, scoring.keyword, cardBaseValue)
      )

    return (
      <>
        {comparisons.map((comparison, index) => {
          if (comparison.outscaledAt === null) {
            const equivalent = calculateCardEquivalentToGivenPoints(
              comparison.fixedPoints,
              cardBaseValue,
              true
            )
            return (
              <p key={index} className={cx('insight-paragraph', { 'follow-up': index > 0 })}>
                The{' '}
                <Highlight mode={ScoringMode.Blightbane} strong>
                  {comparison.fixedPoints}
                </Highlight>{' '}
                <strong>fixed bonus</strong> for{' '}
                <GradientLink
                  text={comparison.cardName}
                  url={`https://blightbane.io/card/${comparison.cardName}`}
                />{' '}
                never gets outscaled by a <strong>keyword</strong> card. At max (
                <Highlight mode={ScoringMode.Blightbane}>220%</Highlight>){' '}
                <strong>malignancy</strong>, this is worth{' '}
                <Code wrap="mobile">
                  <strong>{equivalent}</strong>
                </Code>{' '}
                <strong>keyword</strong> card(s).
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
            <p key={index} className={cx('insight-paragraph', { 'follow-up': index > 0 })}>
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
    if (cardBaseValue < 0 || keywords.length === 0) {
      return (
        <p className={cx('insight-paragraph')}>
          There is no reliable way to break past the <strong>accuracy window</strong> and still come
          out ahead.
        </p>
      )
    }

    const justAbove = findCombinationJustAbove(
      breakTarget,
      cardBaseValue,
      buffer,
      diminishingReturnsLimit
    )

    return (
      <p className={cx('insight-paragraph')}>
        For a <strong>net positive score</strong> after breaking the{' '}
        <strong>accuracy window</strong>, you need <em>at least</em>{' '}
        {justAbove && (
          <>
            <Code>
              <strong>{justAbove.combination.description}</strong>
            </Code>{' '}
            <strong>keyword</strong> cards per{' '}
            <Highlight mode={ScoringMode.Blightbane}>{buffer}</Highlight> cards over{' '}
            <Highlight mode={ScoringMode.Blightbane}>{target}</Highlight>. This gives you{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {justAbove.totalScore}
            </Highlight>{' '}
            (<Code>{justAbove.combination.calculation}</Code>
            ), which puts you ahead of the penalty by{' '}
            <Highlight mode={ScoringMode.Blightbane}>
              {justAbove.totalScore - breakTarget}
            </Highlight>{' '}
            points .
          </>
        )}
      </p>
    )
  }

  return (
    <div className={cx('scoring-container')}>
      <p>
        Additional number-crunching based on the above values.{' '}
        <span className={cx('warning')}>Experimental feature!</span>
      </p>

      <h4 className={cx('subheader')}>
        <Highlight mode={ScoringMode.Blightbane} strong>
          »
        </Highlight>{' '}
        Standard:
      </h4>

      {renderStandardParametersTips()}

      <h4 className={cx('subheader')}>
        <Highlight mode={ScoringMode.Blightbane} strong>
          »
        </Highlight>{' '}
        Fixed vs Scaling:
      </h4>

      {renderFixedVsKeywordsTips()}

      <h4 className={cx('subheader')}>
        <Highlight mode={ScoringMode.Blightbane} strong>
          »
        </Highlight>{' '}
        Accuracy Window
      </h4>

      {renderWindowBreakTips()}
    </div>
  )
}

export default AdvancedInsight
