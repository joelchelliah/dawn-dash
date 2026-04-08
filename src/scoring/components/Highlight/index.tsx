import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface HighlightProps {
  children: React.ReactNode
  mode: ScoringMode
  className?: string
}

const getHighlightClass = (mode: ScoringMode): string => {
  switch (mode) {
    case ScoringMode.Standard:
      return 'highlight--standard'
    case ScoringMode.Sunforge:
      return 'highlight--sunforge'
    case ScoringMode.WeeklyChallenge:
      return 'highlight--weekly-challenge'
    case ScoringMode.Blightbane:
      return 'highlight--blightbane'
    default:
      return ''
  }
}

function Highlight({ children, mode, className }: HighlightProps): JSX.Element {
  const highlightClass = getHighlightClass(mode)
  return <span className={cx('highlight', highlightClass, className)}>{children}</span>
}

export default Highlight
