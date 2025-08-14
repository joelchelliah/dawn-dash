import { createCx } from '@/shared/utils/classnames'
import GradientDivider from '@/shared/components/GradientDivider'

import styles from './index.module.scss'

const cx = createCx(styles)

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
  const buttonRowClassName = cx('button-row', className, {
    'button-row--left': align === 'left',
    'button-row--right': align === 'right',
  })

  return (
    <div className={cx('button-row-container')}>
      {includeBorder && <GradientDivider spacingBottom="lg" />}
      <div className={buttonRowClassName}>{children}</div>
    </div>
  )
}

export default ButtonRow
