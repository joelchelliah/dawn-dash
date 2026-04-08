import { useState, ReactNode } from 'react'

import { createCx } from '@/shared/utils/classnames'

import ScoringButton from '@/scoring/components/ScoringButton'
import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface SpoilerTextProps {
  children: ReactNode
  mode: ScoringMode
  label: string
}

export default function SpoilerText({ children, mode, label }: SpoilerTextProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  if (isRevealed) {
    return <span className={cx('revealed-content')}>{children}</span>
  }

  return (
    <ScoringButton className={cx('reveal-button')} onClick={() => setIsRevealed(true)} mode={mode}>
      {label}
    </ScoringButton>
  )
}
