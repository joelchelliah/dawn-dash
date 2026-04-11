import Code from '@/shared/components/Code'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { findCombinationJustAbove } from '@/scoring/utils/advancedScoring'

import Highlight from '../Highlight'

interface AdvancedInsightProps {
  challengeData: WeeklyChallengeData
}

function AdvancedInsight({ challengeData }: AdvancedInsightProps): JSX.Element {
  const { scoring } = challengeData

  if (scoring.calculationType !== 'DiminishingReturns') {
    return (
      <p>
        ⚠️ <strong>Whoops!</strong> The score calculation type for this challenge is &quot;
        <strong>{scoring.calculationType}</strong>&quot;. This section is not yet supported for that
        type.
      </p>
    )
  }

  const { accuracyBaseValue, target, buffer, cardBaseValue, diminishingReturnsLimit } = scoring
  const breakTarget = accuracyBaseValue * 0.1

  const justAbove = findCombinationJustAbove(
    breakTarget,
    cardBaseValue,
    buffer,
    diminishingReturnsLimit
  )

  return (
    <>
      <p>
        To come out ahead after breaking the <strong>accuracy window</strong>, you must collect at
        least{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          {breakTarget}
        </Highlight>{' '}
        (scalable) points, for every time you pass the <strong>buffer</strong> (
        <Highlight mode={ScoringMode.Blightbane} strong>
          {buffer}
        </Highlight>{' '}
        cards) beyond the target count of{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          {target}
        </Highlight>
        .
      </p>
      <p>
        A combination of{' '}
        {justAbove && (
          <>
            <Code>
              <strong>{justAbove.combination.description}</strong>
            </Code>{' '}
            keywords-matching cards gives you{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {justAbove.totalScore}
            </Highlight>{' '}
            (<Code>{justAbove.combination.calculation}</Code>
            ). Getting a similar or stronger combinations of{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {buffer}
            </Highlight>{' '}
            scoring cards, each time you pass the <strong>buffer</strong>, will guarantee a{' '}
            <strong>net positive score</strong>.
          </>
        )}
      </p>
    </>
  )
}

export default AdvancedInsight
