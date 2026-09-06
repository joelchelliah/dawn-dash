import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import Highlight from '../Highlight'
import ScoringList from '../ScoringList'

import styles from './index.module.scss'

const cx = createCx(styles)

const RARITY_BASE_POINTS = [
  { rarity: 'Common', points: 50 },
  { rarity: 'Uncommon', points: 75 },
  { rarity: 'Rare', points: 113 },
  { rarity: 'Legendary', points: 169 },
  { rarity: 'Monster', points: 50, note: '(scored as a common, but is actually a lower rarity)' },
]

interface RarityScoringListProps {
  mode: ScoringMode
}

function RarityScoringList({ mode }: RarityScoringListProps): JSX.Element {
  return (
    <ScoringList mode={mode}>
      {RARITY_BASE_POINTS.map(({ rarity, points, note }) => (
        <li key={rarity}>
          <strong>{rarity}</strong> - <Highlight mode={mode}>{points}</Highlight>{' '}
          {note && <span className={cx('rarity-note')}>{note}</span>}
        </li>
      ))}
    </ScoringList>
  )
}

export default RarityScoringList
