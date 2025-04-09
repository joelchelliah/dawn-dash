import cx from 'classnames'

import styles from './index.module.scss'

interface ButtonRowProps {
  align?: 'left' | 'right'
  includeBorder?: boolean
  children: React.ReactNode
}

function ButtonRow({
  children,
  align = 'right',
  includeBorder = false,
}: ButtonRowProps): JSX.Element {
  const className = cx(styles['button-row'], {
    [styles['button-row--left']]: align === 'left',
    [styles['button-row--right']]: align === 'right',
    [styles['button-row--border']]: includeBorder,
  })

  return <div className={className}>{children}</div>
}

export default ButtonRow
