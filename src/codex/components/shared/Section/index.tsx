import Divider from '@/shared/components/Divider'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

type SectionSpacing =
  // `stacked` pushes the section away from whatever precedes it
  | 'stacked'
  // `none` leaves the spacing to a parent that already sets its own gap.
  | 'none'

interface SectionProps {
  title: string
  dividerColor?: string
  spacing?: SectionSpacing
  children: React.ReactNode
}

function Section({
  title,
  dividerColor,
  spacing = 'stacked',
  children,
}: SectionProps): JSX.Element {
  return (
    <div className={cx('section', `section--${spacing}`)}>
      <h4>{title}</h4>
      <Divider spacingBottom="sm" color={dividerColor} />
      {children}
    </div>
  )
}

export default Section
