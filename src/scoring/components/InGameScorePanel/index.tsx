import Code from '@/shared/components/Code'
import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { AdaptiveEdgeImageUrl, SunforgeImageUrl } from '@/shared/utils/imageUrls'

import { GameMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import ExampleBox from '../ExampleBox'
import Highlight from '../Highlight'
import ParameterRankTable from '../ParameterRankTable'

import styles from './index.module.scss'

const cx = createCx(styles)

interface InGameScorePanelProps {
  mode: GameMode
  openByDefault?: boolean
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

function InGameScorePanel({ mode, openByDefault = false }: InGameScorePanelProps): JSX.Element {
  const title = mode === GameMode.Sunforge ? 'Sunforge score' : 'Standard score'

  return (
    <CollapsiblePanel
      title={title}
      imageUrl={mode === GameMode.Sunforge ? SunforgeImageUrl : AdaptiveEdgeImageUrl}
      mode={mode}
      collapsible
      defaultExpanded={openByDefault}
    >
      <div className={cx('content')}>
        <p>
          Your <Highlight mode={mode}>Standard</Highlight> mode score is determined by the sum of
          your score in six different parameters, multiplied by your <strong>Malignancy</strong>{' '}
          modifier. These six parameters are:
        </p>

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
          Each parameter is assigned a rank from <strong>one</strong> to <strong>nine</strong>{' '}
          <span className={cx('nobr')}>
            (<strong>I</strong> – <strong>IX</strong>),
          </span>{' '}
          based on your performance, and you will be given a score corresponding to that rank.
          <br />
          <br />
          <strong>At the maximum rank (IX):</strong>
        </p>

        <ul className={cx('simple-list')}>
          <li>
            <strong>⚔️ Damage, ❤️ Awareness, 🃏 Versatility,</strong> and <strong>💰 Wealth</strong>{' '}
            give you <Highlight mode={mode}>2000</Highlight> points each.
          </li>
          <li>
            <strong>💨 Lethality</strong> gives you <Highlight mode={mode}>500</Highlight> points.
          </li>
          <li>
            <strong>💀 Bosses defeated</strong> depends on your difficulty in addition to the kill
            count. Maxing out at <Highlight mode={mode}>6000</Highlight> points on Impossible
            difficulty.
          </li>
        </ul>

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

        <p>Here&apos;s a detailed breakdown of each parameter:</p>

        <ParameterRankTable mode={mode} />

        <br />
        <p>
          Your in-game <strong>base score</strong> is the sum of these six parameters. If you max
          out everything on <strong>Impossible</strong> difficulty, this gives you a base score of{' '}
          <Highlight mode={mode}>14,500</Highlight> (<Code>6000 + 4 × 2000 + 500</Code>).
        </p>

        <p>
          This score is then multiplied by your <strong>Malignancy</strong> modifier, which is the
          sum of all malignancies enabled for the run. As of the time of writing{' '}
          <small>
            <em>(01.04.2026)</em>
          </small>
          , the highest malignancy percentage you can have is <strong>220%</strong>. Going with the
          numbers above, this gives us a Malignancy bonus of{' '}
          <Highlight mode={mode}>31,900</Highlight> (<Code>14500 × 2.2</Code>).
        </p>
        <p>
          Adding that to the base score, puts the highest achievable in-game score for an{' '}
          <strong>Impossible</strong> run at <Highlight mode={mode}>46,400</Highlight> (
          <Code>14500 + 31900</Code>)!
        </p>

        <p>Similarily for the other difficulties, the highest achievable scores are:</p>

        <ul className={cx('simple-list')}>
          {MAX_SCORES.map(({ difficulty, score, calc }) => (
            <li key={difficulty}>
              <strong>{difficulty}</strong>:{' '}
              <Highlight mode={mode}>{score.toLocaleString()}</Highlight> ({<Code>{calc}</Code>})
            </li>
          ))}
        </ul>
      </div>

      <ExampleBox emoji="💯" mode={mode}>
        These numbers will of course vary over time, as the game introduces new malignancies, or
        tweaks existing ones.
      </ExampleBox>
    </CollapsiblePanel>
  )
}

export default InGameScorePanel
