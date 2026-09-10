import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

type Spacing = 'xs' | 'sm' | 'md' | 'lg'

interface DividerProps {
  spacingBottom: Spacing
  widthPercentage?: number
  color?: string
}

const Divider = ({ spacingBottom = 'sm', widthPercentage = 100, color }: DividerProps) => {
  const spacingBottomMap = {
    xs: '-0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
  }

  return (
    <div
      className={cx('divider', {
        'divider--gradient': !color,
        'divider--solid': Boolean(color),
      })}
      style={{
        margin: 'auto',
        marginBottom: spacingBottomMap[spacingBottom],
        width: `${widthPercentage}%`,
        background: color ? `linear-gradient(to right, ${color}, transparent)` : undefined,
      }}
    />
  )
}

export default Divider
