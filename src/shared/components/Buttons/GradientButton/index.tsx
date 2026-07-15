import { memo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Button from '@/shared/components/Buttons/Button'

import { BaseButtonProps } from '../types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface GradientButtonProps extends BaseButtonProps {
  isLoading?: boolean
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
  disabled,
  type = 'button',
  ariaLabel,
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
    <Button
      className={buttonClassName}
      onClick={handleClick}
      type={type}
      isLoading={isLoading}
      disabled={disabled}
      ariaLabel={ariaLabel}
    >
      {children}
    </Button>
  )
}

export default memo(GradientButton)
