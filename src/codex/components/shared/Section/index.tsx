import Divider from '@/shared/components/Divider'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

type SectionSpacing =
  // `medium` adds a medium amount of spacing between the section and the previous section
  | 'medium'
  // `small` adds a small amount of spacing between the section and the previous section
  | 'small'
  // `none` leaves the spacing to a parent that already sets its own gap.
  | 'none'

interface SectionProps {
  title: React.ReactNode
  dividerColor?: string
  spacing?: SectionSpacing
  children: React.ReactNode
}

function Section({ title, dividerColor, spacing = 'none', children }: SectionProps): JSX.Element {
  return (
    <div className={cx('section', `section--${spacing}`)}>
      <h4>{title}</h4>
      <Divider spacingBottom="sm" color={dividerColor} />
      {children}
    </div>
  )
}

export default Section
