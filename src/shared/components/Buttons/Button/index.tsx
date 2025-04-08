import cx from 'classnames'

import LoadingDots from '../../LoadingDots'

import styles from './index.module.scss'

interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  className?: string
  isLoading?: boolean
  style?: React.CSSProperties
}

function Button({
  children,
  onClick,
  className,
  style,
  isLoading = false,
}: ButtonProps): JSX.Element {
  const buttonClassName = cx(styles['button'], className, {
    [styles['button--loading']]: isLoading,
  })

  return (
    <button className={buttonClassName} onClick={onClick} style={style} disabled={isLoading}>
      {isLoading ? <LoadingDots color="#bbb" /> : children}
    </button>
  )
}

export default Button
