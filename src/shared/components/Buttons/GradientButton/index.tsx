import cx from 'classnames'

import Button from '../Button'

import styles from './index.module.scss'

interface GradientButtonProps {
  children: React.ReactNode
  onClick: () => void
  isLoading?: boolean
  className?: string
  subtle?: boolean
}

function GradientButton({
  children,
  onClick,
  isLoading,
  className,
  subtle,
}: GradientButtonProps): JSX.Element {
  const handleClick = () => {
    if (!isLoading) onClick()
  }

  const buttonClassName = cx(styles['gradient-button'], className, {
    [styles['gradient-button--colored']]: !subtle && !isLoading,
    [styles['gradient-button--subtle']]: subtle && !isLoading,
  })

  return (
    <Button className={buttonClassName} onClick={handleClick} type="button" isLoading={isLoading}>
      {children}
    </Button>
  )
}

export default GradientButton
