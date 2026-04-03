import { useState } from 'react'
import Code from '@/shared/components/Code'
import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { AdaptiveEdgeImageUrl, SunforgeImageUrl } from '@/shared/utils/imageUrls'

import { GameMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import ExampleBox from '../ExampleBox'
import Highlight from '../Highlight'
import ParameterRankTable from '../ParameterRankTable'
import ScoringList from '../ScoringList'

import styles from './index.module.scss'
import ScoringButton from '../ScoringButton'
import GradientLink from '@/shared/components/GradientLink'
import InfoModal from '@/shared/components/Modals/InfoModal'

const cx = createCx(styles)

interface InGameScorePanelProps {
  mode: GameMode
  openByDefault?: boolean
  includeWeeklyInfo?: boolean
}

const SCORE_PARAMETERS = [
  {
    label: 'Bosses defeated',
    emoji: '💀',
    description: 'Number of bosses killed',
  },
  {
    label: 'Damage',
    emoji: '⚔️',
    description: 'Highest damage dealt in a single action or effect',
  },
  {
    label: 'Awareness',
    emoji: '❤️',
    description: 'Total damage taken',
  },
  {
    label: 'Lethality',
    emoji: '💨',
    description: 'Average turns per fight',
  },
  {
    label: 'Versatility',
    emoji: '🃏',
    description: 'Number of distinct cards in your deck',
  },
  {
    label: 'Wealth',
    emoji: '💰',
    description: 'Sum of your gold and your deck value',
  },
]

const MAX_SCORES = [
  { difficulty: 'Hard', score: 40000, calc: '(4000 + 4 × 2000 + 500) × (1 + 2.2)' },
  { difficulty: 'Challenging', score: 31680, calc: '(1400 + 4 × 2000 + 500) × (1 + 2.2)' },
  { difficulty: 'Normal', score: 29440, calc: '(700 + 4 × 2000 + 500) × (1 + 2.2)' },
]

function getIntro(mode: GameMode, includeWeeklyInfo: boolean): JSX.Element {
  if (mode === GameMode.Standard && !includeWeeklyInfo) {
    return (
      <>
        <p>
          Your <Highlight mode={mode}>Standard</Highlight> mode score is determined by the following
          two factors:
        </p>
        <ScoringList
          mode={mode}
          items={[
            <>
              How well you perform in <strong>six scoring parameters</strong>.
            </>,
            <>
              The <strong>malignancies</strong> you&apos;ve enabled for the run.
            </>,
          ]}
        />
        <p>
          The combined score from these <strong>six scoring parameters</strong> are multiplied by
          your <strong>malignancy modifier</strong> to give your final score. These parameters are:
        </p>
      </>
    )
  } else if (mode === GameMode.Sunforge && !includeWeeklyInfo) {
    return (
      <>
        <p>
          Your <Highlight mode={mode}>Sunforge</Highlight> score is determined by the following two
          factors:
        </p>
        <ScoringList
          mode={mode}
          items={[
            <>
              How well you perform in <strong>six scoring parameters</strong>.
            </>,
            <>
              The number of extra <strong>rerolls</strong> you have left at the end of the run.
            </>,
          ]}
        />
        <p>
          Unlike in <Highlight mode={GameMode.Standard}>Standard</Highlight>, your score is not
          directly enhanced by your enabled malignancies, but picking harder malignancies does give
          you more rerolls, which in turn leads to a higher score!
        </p>
        <p>
          The combined score from your <strong>six scoring parameters</strong>, along with your{' '}
          <strong>reroll bonus</strong>, gives you your final score. These parameters are:
        </p>
      </>
    )
  } else if (mode === GameMode.WeeklyChallenge && includeWeeklyInfo) {
    return (
      <p>
        Your <Highlight mode={mode}>Weekly Challenge</Highlight> score is determined by the sum of
        your scores in <strong>six different parameters</strong>, multiplied by a{' '}
        <strong>Malignancy</strong> modifier based on your enabled malignancies. These six
        parameters are:
      </p>
    )
  }
  throw new Error(`Invalid mode: [${mode}, ${includeWeeklyInfo}]`)
}

function InGameScorePanel({
  mode,
  openByDefault = false,
  includeWeeklyInfo = false,
}: InGameScorePanelProps): JSX.Element {
  const title = mode === GameMode.Sunforge ? 'Sunforge score' : 'Standard score'
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false)

  return (
    <CollapsiblePanel
      title={title}
      imageUrl={mode === GameMode.Sunforge ? SunforgeImageUrl : AdaptiveEdgeImageUrl}
      mode={mode}
      collapsible
      defaultExpanded={openByDefault}
    >
      <div className={cx('content')}>
        {getIntro(mode, includeWeeklyInfo)}

        <div className={cx('columns')}>
          <div className={cx('left-column')}>
            <Image
              src="/scoring/in-game-score.webp"
              alt="In-Game Score Example"
              width={302}
              height={310}
              className={cx('score-image')}
            />
          </div>
          <div className={cx('right-column', `right-column--${mode}`)}>
            <ul className={cx('score-parameters')}>
              {SCORE_PARAMETERS.map(({ label, emoji, description }) => (
                <li key={label}>
                  <span className={cx('label')}>
                    {emoji} {label}:
                  </span>{' '}
                  <span className={cx('description')}>{description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <br />
        <p>
          Each parameter is assigned a <strong>rank</strong> from one to nine{' '}
          <span className={cx('nobr')}>
            (<strong>I</strong> – <strong>IX</strong>),
          </span>{' '}
          based on your performance, and you will be given a score corresponding to that rank.
          <br />
          <br />
          <strong>At the maximum rank (IX):</strong>
        </p>

        <ScoringList
          mode={mode}
          items={[
            <>
              <strong>⚔️ Damage, ❤️ Awareness, 🃏 Versatility,</strong> and{' '}
              <strong>💰 Wealth</strong> give you <Highlight mode={mode}>2000</Highlight> points
              each.
            </>,
            <>
              <strong>💨 Lethality</strong> gives you <Highlight mode={mode}>500</Highlight> points.
            </>,
            <>
              <strong>💀 Bosses defeated</strong> depends on your difficulty in addition to the kill
              count. Maxing out at <Highlight mode={mode}>6000</Highlight> points on Impossible
              difficulty.
            </>,
          ]}
        />

        <p>
          Score growth between ranks is <strong>non-linear</strong>. Meaning that jumping from rank{' '}
          <strong>VIII</strong> (8) to <strong>IX</strong> (9) in one parameter is usually worth a
          lot more than jumping from <strong>I</strong> to <strong>V</strong> in another. Important
          to keep in mind if you are forced to prioritize one parameter over another. Sadly, most of
          these parameters are completely invisible to you during the run, so you&apos;ll have to
          keep track of them on your own.
        </p>

        <ExampleBox emoji="🧠" mode={mode}>
          Sacrificing a perfect <strong>Awareness</strong> score, just to slightly improve your{' '}
          <strong>Versatility</strong>, is effectively never worth it! One exception might be{' '}
          <strong>Lethality</strong>, as it only gives you a measly <strong>500</strong> points at
          max rank, and also drops very slowly.
        </ExampleBox>

        <p>
          Here&apos;s a detailed breakdown of each <strong>parameter</strong>:
        </p>

        <ParameterRankTable mode={mode} />

        <div className={cx('disclaimer')}>
          <GradientLink
            text="A disclaimer on the info above"
            onClick={() => setIsDisclaimerOpen(true)}
            className={cx('disclaimer__link')}
          />
        </div>

        <InfoModal isOpen={isDisclaimerOpen} onClose={() => setIsDisclaimerOpen(false)}>
          <p>
            📋 As of the time of writing, there is no official documentation on the thresholds for
            the different parameter ranks.
          </p>
          <p>
            All information shared here is based on personal experience, run summaries from the{' '}
            <strong>Dawncaster Discord</strong>, and discussions with other long-time players.
          </p>
          <p>
            If you notice any discrepancies, in either the ranks numbers or any other information,
            please let me know on either <strong>Discord</strong> or <strong>GitHub</strong> (see
            link in the footer)!
          </p>
        </InfoModal>

        <br />
        <p>
          Your in-game <strong>base score</strong> is the sum of your scores in the six parameters
          above.{' '}
          {mode === GameMode.Standard && (
            <>
              If you max out everything on <strong>Impossible</strong> difficulty, this gives you a
              base score of <Highlight mode={mode}>14,500</Highlight> (
              <Code>6000 + 4 × 2000 + 500</Code>).
            </>
          )}
          {mode === GameMode.Sunforge && (
            <>
              Maxing out every single parameter gives you a base score of{' '}
              <Highlight mode={mode}>20,250</Highlight> (<Code>11750 + 4 × 2000 + 500</Code>).
            </>
          )}
        </p>

        {mode === GameMode.Standard && (
          <>
            <p>
              This score is then multiplied by your <strong>Malignancy</strong> modifier, which is
              the sum of all malignancies enabled for the run. As of the time of writing{' '}
              <small>
                <em>(01.04.2026)</em>
              </small>
              , the highest malignancy percentage you can have is <strong>220%</strong>. Going with
              the numbers above, this gives us a Malignancy bonus of{' '}
              <Highlight mode={mode}>31,900</Highlight> (<Code>14500 × 2.2</Code>).
            </p>
            <p>
              Adding that to the base score, puts the highest achievable in-game score for an{' '}
              <strong>Impossible</strong> run at <Highlight mode={mode}>46,400</Highlight> (
              <Code>14500 + 31900</Code>)!
            </p>

            <p>Similarily for the other difficulties, the highest achievable scores are:</p>

            <ScoringList
              mode={mode}
              items={MAX_SCORES.map(({ difficulty, score, calc }) => (
                <>
                  <strong>{difficulty}</strong>:{' '}
                  <Highlight mode={mode}>{score.toLocaleString()}</Highlight> ({<Code>{calc}</Code>}
                  )
                </>
              ))}
            />

            <p>
              These numbers will of course vary over time, as the game introduces new malignancies,
              or tweaks the percentages on existing ones.
            </p>
          </>
        )}
        {mode === GameMode.Sunforge && (
          <>
            <p>
              This score is then multiplied by your <strong>Reroll bonus</strong> modifier, which
              starts off at <strong>0%</strong>, and can be increased up to four times via your{' '}
              <Highlight mode={mode}>Sunforge</Highlight> rewards track. At the maximmum of{' '}
              <strong>4%</strong>, ending a run with 30 extra rerolls gives the above example a{' '}
              <strong>Reroll bonus score</strong> of <Highlight mode={mode}>24,300</Highlight> (
              <Code>20250 × 0.04 × 30</Code>).
            </p>
            <p>
              Adding that to the base score, puts the total score at{' '}
              <Highlight mode={mode}>44,550</Highlight> (<Code>20250 + 24300</Code>). More than
              double the initial score!
            </p>
            <p>
              In addition to being frugal with your rerolls, there are a number of other ways to
              ensure a high reroll count at the end of the run:
            </p>
            <ScoringList
              mode={mode}
              items={[
                <>
                  Enabling harder malignancies. The hardest ones, like <strong>Rotting</strong>,
                  give you 5 extra rerolls!
                </>,
                <>
                  Enabling more <strong>Cardsets</strong>. Each one gives you an extra reroll.
                </>,
                <>
                  Use (or avoid) the <strong>Free rerolls</strong> options. Depends on your
                  playstyle.
                </>,
                <>
                  Choose <strong>extra rerolls</strong> as rewards after combat whenever possible.
                </>,
              ]}
            />

            <p>
              The tricky bit is figuring out how few rerolls you can get away with using, and still
              draft a winning deck that will maximize your score.
            </p>
          </>
        )}
      </div>

      {mode === GameMode.Standard && (
        <ExampleBox emoji="👺" mode={mode}>
          <>
            There is one very niche way of going over the maximum malignancy percentage. If you play
            an <strong>Invasions</strong> run, and pick up the <strong>Offer of Pride</strong> while
            already having five malignancies, you will be granted a sixth malignancy!
          </>
        </ExampleBox>
      )}

      {mode === GameMode.Sunforge && (
        <ExampleBox emoji="🎲" mode={mode}>
          <>
            There is also a post-combat reward that says{' '}
            <strong>"Choose 1 of 3 cards (and gain 1 reroll token)"</strong>. Depending on your
            luck, you may see this between 0 and 12 times during the run.
          </>
        </ExampleBox>
      )}
    </CollapsiblePanel>
  )
}

export default InGameScorePanel
