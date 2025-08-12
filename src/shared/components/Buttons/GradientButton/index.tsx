import { useState } from 'react'

import cx from 'classnames'

import Button from '../Button'

import styles from './index.module.scss'

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

  const buttonClassName = cx(styles['gradient-button'], className, {
    [styles['gradient-button--colored']]: !subtle && !isLoading,
    [styles['gradient-button--subtle']]: subtle && !isLoading,
    [styles['gradient-button--bold']]: bold,
    [styles['gradient-button--pulse']]: isAnimating,
  })

  return (
    <Button className={buttonClassName} onClick={handleClick} type="button" isLoading={isLoading}>
      {children}
    </Button>
  )
}

export default GradientButton
