import { memo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Button from '@/shared/components/Buttons/Button'

import styles from './index.module.scss'

const cx = createCx(styles)

interface GradientButtonProps {
  children: React.ReactNode
  onClick: () => void
  isLoading?: boolean
  className?: string
  subtle?: boolean
  bold?: boolean
  showClickAnimation?: boolean
}

function GradientButton({
  children,
  onClick,
  isLoading,
  className,
  subtle,
  bold,
  showClickAnimation = false,
}: GradientButtonProps): JSX.Element {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = () => {
    if (!isLoading) {
      if (showClickAnimation) {
        setIsAnimating(true)
        setTimeout(() => setIsAnimating(false), 200)
      }
      onClick()
    }
  }

  const buttonClassName = cx('gradient-button', className, {
    'gradient-button--colored': !subtle && !isLoading,
    'gradient-button--subtle': subtle && !isLoading,
    'gradient-button--bold': bold,
    'gradient-button--pulse': isAnimating,
  })

  return (
    <Button className={buttonClassName} onClick={handleClick} type="button" isLoading={isLoading}>
      {children}
    </Button>
  )
}

export default memo(GradientButton)
