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
  /*
   * Set this when the children style their own text (e.g. with a gradient of their own).
   *
   * The gradient text styling uses `background-clip: text`, which makes the button paint the
   * text of its children using its own background. If the children already paint themselves,
   * the text ends up rendered twice — once per coordinate space, which is visible as a ghost
   * copy whenever either element is animated or transformed.
   */
  hasStyledContent?: boolean
}

function GradientButton({
  children,
  onClick,
  isLoading,
  className,
  subtle,
  bold,
  showClickAnimation = false,
  hasStyledContent = false,
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
    'gradient-button--colored': !subtle && !isLoading && !hasStyledContent,
    'gradient-button--subtle': subtle && !isLoading && !hasStyledContent,
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
