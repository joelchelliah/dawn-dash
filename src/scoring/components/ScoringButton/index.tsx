import { memo } from 'react'

import Button from '@/shared/components/Buttons/Button'
import { createCx } from '@/shared/utils/classnames'

import { GameMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScoringButtonProps {
  children: React.ReactNode
  onClick: () => void
  mode: GameMode
  isLoading?: boolean
  type?: 'button' | 'submit'
  style?: React.CSSProperties
}

function ScoringButton({
  children,
  onClick,
  mode,
  style,
  isLoading = false,
  type,
}: ScoringButtonProps): JSX.Element {
  const buttonClassName = cx('scoring-button', `scoring-button--${mode}`)

  return (
    <Button
      onClick={onClick}
      className={buttonClassName}
      style={style}
      isLoading={isLoading}
      type={type}
    >
      {children}
    </Button>
  )
}

export default memo(ScoringButton)
