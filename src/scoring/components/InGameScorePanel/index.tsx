import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import CollapsiblePanel from '../CollapsiblePanel'
import ExampleBox from '../ExampleBox'
import ParameterRankTable from '../ParameterRankTable'

import styles from './index.module.scss'

const cx = createCx(styles)

interface InGameScorePanelProps {
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
  { difficulty: 'Impossible', score: 47125 },
  { difficulty: 'Hard', score: 40625 },
  { difficulty: 'Challenging', score: 32175 },
  { difficulty: 'Normal', score: 29900 },
]

function InGameScorePanel({ openByDefault = false }: InGameScorePanelProps): JSX.Element {
  const title = <span>💯 &nbsp;In-Game Score</span>

  return (
    <CollapsiblePanel title={title} collapsible defaultExpanded={openByDefault}>
      <div className={cx('content')}>
        <p>The in-game score is determined by the following six parameters:</p>

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
          <div className={cx('right-column')}>
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
            give you <strong>2000 points</strong> each.
          </li>
          <li>
            <strong>💨 Lethality</strong> gives you <strong>500 points</strong>.
          </li>
          <li>
            <strong>💀 Bosses defeated</strong> depends on your difficulty in addition to the kill
            count. Maxing out at <strong>6000 points</strong> on Impossible difficulty.
          </li>
        </ul>

        <p>
          Score growth between ranks is <strong>non-linear</strong>. Meaning that jumping from rank{' '}
          <strong>VIII</strong> (8) to <strong>IX</strong> (9) in one parameter is usually worth a
          lot more than jumping from <strong>I</strong> to <strong>III</strong> in another.
        </p>

        <ExampleBox emoji="💡">
          Sacrificing a perfect <strong>Awareness</strong> score, just to slightly improve your{' '}
          <strong>Versatility</strong>, is effectively never worth it! One exception might be{' '}
          <strong>Lethality</strong>, as it only gives you a measly <strong>500</strong> points at
          max rank.
        </ExampleBox>

        <p>Here&apos;s a detailed breakdown of the ranks and scores for each parameter:</p>

        <ParameterRankTable />

        <div className={cx('section')}>
          <h3 className={cx('section-title')}>🏆 Maximum In-Game Score</h3>
          <p>
            The total in-game <em>base</em> score is the sum of all these parameters. If you max out
            everything on Impossible difficulty, this gives you a base of <strong>14,500</strong>{' '}
            (6000 + 4 × 2000 + 500).
          </p>

          <p>
            This score is then multiplied by your <strong>malignancy modifier</strong>. As of the
            time of writing, the max malignancy % you can have is <strong>225%</strong>.
          </p>

          <p>
            Taking that into account, the highest achievable in-game score for either a{' '}
            <strong>Regular run</strong> or a <strong>Weekly Challenge</strong> run is:
          </p>

          <table className={cx('max-scores-table')}>
            <thead>
              <tr>
                <th>Difficulty</th>
                <th>Maximum Score</th>
              </tr>
            </thead>
            <tbody>
              {MAX_SCORES.map(({ difficulty, score }) => (
                <tr key={difficulty}>
                  <td className={cx('difficulty-name')}>{difficulty}</td>
                  <td className={cx('max-score')}>{score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CollapsiblePanel>
  )
}

export default InGameScorePanel
