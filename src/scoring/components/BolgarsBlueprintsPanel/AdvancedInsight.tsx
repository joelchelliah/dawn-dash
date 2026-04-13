import Code from '@/shared/components/Code'
import { createCx } from '@/shared/utils/classnames'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { findCombinationJustAbove } from '@/scoring/utils/advancedScoring'

import Highlight from '../Highlight'

import styles from './index.module.scss'

const cx = createCx(styles)

interface AdvancedInsightProps {
  challengeData: WeeklyChallengeData
}

function AdvancedInsight({ challengeData }: AdvancedInsightProps): JSX.Element {
  const { scoring } = challengeData

  if (scoring.calculationType !== 'DiminishingReturns') {
    return (
      <div className={cx('unavailable')}>
        <p>
          ⚠️ The score calculation type for this challenge is &quot;
          <strong>{scoring.calculationType}</strong>&quot;. This section is not yet supported for
          that type.
        </p>
      </div>
    )
  }

  const { accuracyBaseValue, target, buffer, cardBaseValue, diminishingReturnsLimit, keywords } =
    scoring
  const breakTarget = accuracyBaseValue * 0.1

  const justAbove = findCombinationJustAbove(
    breakTarget,
    cardBaseValue,
    buffer,
    diminishingReturnsLimit
  )

  const renderWindowBreakTips = () => {
    if (keywords.length === 0) {
      return (
        <>
          <p>
            Since there are no <strong>keywords</strong> this week, there is no reliable way to
            break the <strong>accuracy window</strong> and still come out ahead.
          </p>
        </>
      )
    }

    if (cardBaseValue < 0) {
      return (
        <>
          <p>
            Since the <strong>keyword bonus</strong> is negative this week, there is no reliable way
            to break the <strong>accuracy window</strong> and still come out ahead.
          </p>
        </>
      )
    }
    return (
      <>
        <p>
          To come out ahead after breaking the <strong>accuracy window</strong>, you must collect at
          least{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {breakTarget}
          </Highlight>{' '}
          (scalable) points, for each time you pass the <strong>buffer</strong> (
          <Highlight mode={ScoringMode.Blightbane} strong>
            {buffer}
          </Highlight>{' '}
          cards) beyond the <strong>target</strong> (
          <Highlight mode={ScoringMode.Blightbane} strong>
            {target}
          </Highlight>{' '}
          cards).
        </p>
        <p className={cx('follow-up')}>
          For a <strong>net positive score</strong>, you need <em>at least</em>{' '}
          {justAbove && (
            <>
              <Code>
                <strong>{justAbove.combination.description}</strong>
              </Code>{' '}
              keyword-cards per <strong>buffer</strong> pass. This is worth{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {justAbove.totalScore}
              </Highlight>{' '}
              (<Code>{justAbove.combination.calculation}</Code>
              ). Aim for similar or stronger combinations per{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {buffer}
              </Highlight>{' '}
              cards over{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {target}
              </Highlight>
              .
            </>
          )}
        </p>
      </>
    )
  }

  return <div className={cx('scoring-container')}>{renderWindowBreakTips()}</div>
}

export default AdvancedInsight
