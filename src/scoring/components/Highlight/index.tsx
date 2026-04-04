import { createCx } from '@/shared/utils/classnames'

import { GameMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface HighlightProps {
  children: React.ReactNode
  mode: GameMode
  className?: string
}

const getHighlightClass = (mode: GameMode): string => {
  switch (mode) {
    case GameMode.Standard:
      return 'highlight--standard'
    case GameMode.Sunforge:
      return 'highlight--sunforge'
    case GameMode.WeeklyChallenge:
      return 'highlight--weekly-challenge'
    case GameMode.Blightbane:
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
