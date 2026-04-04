import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScoringListProps {
  items: JSX.Element[]
  mode: ScoringMode
}

function ScoringList({ items, mode }: ScoringListProps): JSX.Element {
  return (
    <ul className={cx('scoring-list', `scoring-list--${mode}`)}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

export default ScoringList
