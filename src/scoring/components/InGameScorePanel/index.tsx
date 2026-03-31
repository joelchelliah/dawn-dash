import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import CollapsiblePanel from '../CollapsiblePanel'

import styles from './index.module.scss'

const cx = createCx(styles)

interface InGameScorePanelProps {
  openByDefault?: boolean
}

const SCORE_PARAMETERS = [
  { label: '💀 Bosses defeated', description: 'Total number of boss kills' },
  { label: '⚔️ Damage', description: 'Highest damage dealt in a single effect' },
  { label: '❤️ Awareness', description: 'Total damage taken' },
  { label: '👟 Lethality', description: 'Average turns per fight' },
  { label: '🃏 Versatility', description: 'Number of distinct cards in your deck' },
  { label: '💰 Wealth', description: 'Sum of your gold and your deck value' },
]

function InGameScorePanel({ openByDefault = false }: InGameScorePanelProps): JSX.Element {
  const title = <span>💯 &nbsp;In-Game Score</span>

  return (
    <CollapsiblePanel title={title} collapsible defaultExpanded={openByDefault}>
      <div className={cx('content')}>
        <p>
          The in-game score is determined by the following six parameters, you&apos;ll find on your
          final score sheet at the end of the run:
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
          <div className={cx('right-column')}>
            <ul className={cx('score-parameters')}>
              {SCORE_PARAMETERS.map(({ label, description }) => (
                <li key={label}>
                  <span className={cx('label')}>{label}:</span>{' '}
                  <span className={cx('description')}>{description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  )
}

export default InGameScorePanel
