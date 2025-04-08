import cx from 'classnames'

import styles from './index.module.scss'

interface ButtonRowProps {
  align?: 'left' | 'right'
  children: React.ReactNode
}

function ButtonRow({ children, align = 'right' }: ButtonRowProps): JSX.Element {
  const className = cx(styles['button-row'], {
    [styles['button-row--left']]: align === 'left',
    [styles['button-row--right']]: align === 'right',
  })

  return <div className={className}>{children}</div>
}

export default ButtonRow
