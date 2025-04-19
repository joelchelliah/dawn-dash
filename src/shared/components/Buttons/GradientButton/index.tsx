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
}

function GradientButton({
  children,
  onClick,
  isLoading,
  className,
  subtle,
  bold,
}: GradientButtonProps): JSX.Element {
  const handleClick = () => {
    if (!isLoading) onClick()
  }

  const buttonClassName = cx(styles['gradient-button'], className, {
    [styles['gradient-button--colored']]: !subtle && !isLoading,
    [styles['gradient-button--subtle']]: subtle && !isLoading,
    [styles['gradient-button--bold']]: bold,
  })

  return (
    <Button className={buttonClassName} onClick={handleClick} type="button" isLoading={isLoading}>
      {children}
    </Button>
  )
}

export default GradientButton
