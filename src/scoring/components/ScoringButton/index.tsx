import { memo } from 'react'

import Button from '@/shared/components/Buttons/Button'
import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScoringButtonProps {
  children: React.ReactNode
  onClick: () => void
  mode: ScoringMode
  isLoading?: boolean
  type?: 'button' | 'submit'
  className?: string
}

function ScoringButton({
  children,
  onClick,
  mode,
  isLoading = false,
  type = 'button',
  className,
}: ScoringButtonProps): JSX.Element {
  const buttonClassName = cx('scoring-button', `scoring-button--${mode}`, className)

  return (
    <Button onClick={onClick} className={buttonClassName} isLoading={isLoading} type={type}>
      {children}
    </Button>
  )
}

export default memo(ScoringButton)
