import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScoringListProps {
  children: React.ReactNode // <li> elements
  mode: ScoringMode
}

function ScoringList({ children, mode }: ScoringListProps): JSX.Element {
  return <ul className={cx('scoring-list', `scoring-list--${mode}`)}>{children}</ul>
}

export default ScoringList
