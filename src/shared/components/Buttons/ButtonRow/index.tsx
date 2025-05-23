import cx from 'classnames'

import GradientDivider from '../../GradientDivider'

import styles from './index.module.scss'

interface ButtonRowProps {
  align?: 'left' | 'right'
  includeBorder?: boolean
  children: React.ReactNode
  className?: string
}

function ButtonRow({
  children,
  align = 'right',
  includeBorder = false,
  className,
}: ButtonRowProps): JSX.Element {
  const buttonRowClassName = cx(styles['button-row'], className, {
    [styles['button-row--left']]: align === 'left',
    [styles['button-row--right']]: align === 'right',
  })

  return (
    <div className={styles['button-row-container']}>
      {includeBorder && <GradientDivider spacingBottom="lg" />}
      <div className={buttonRowClassName}>{children}</div>
    </div>
  )
}

export default ButtonRow
