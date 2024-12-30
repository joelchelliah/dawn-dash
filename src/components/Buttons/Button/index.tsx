import cx from 'classnames'

import styles from './index.module.scss'

interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  className?: string
  style?: React.CSSProperties
}

function Button({ children, onClick, className, style }: ButtonProps): JSX.Element {
  return (
    <button className={cx(styles['button'], className)} onClick={onClick} style={style}>
      {children}
    </button>
  )
}

export default Button
