import cx from 'classnames'

import Button from '../Button'

import styles from './index.module.scss'

interface GradientButtonProps {
  children: React.ReactNode
  onClick: () => void
  className?: string
  subtle?: boolean
}

function GradientButton({
  children,
  onClick,
  className,
  subtle,
}: GradientButtonProps): JSX.Element {
  const buttonClassName = cx(styles['gradient-button'], className, {
    [styles['gradient-button--colored']]: !subtle,
  })

  return (
    <Button className={buttonClassName} onClick={onClick}>
      {children}
    </Button>
  )
}

export default GradientButton
