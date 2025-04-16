import cx from 'classnames'

import GradientDivider from '../../GradientDivider'

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

  return (
    <div className={styles['button-row-container']}>
      {includeBorder && <GradientDivider spacingBottom="lg" />}
      <div className={className}>{children}</div>
    </div>
  )
}

export default ButtonRow
