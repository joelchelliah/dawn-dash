import Divider from '@/shared/components/Divider'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

type SectionSpacing = 'stacked' | 'none'

interface TreasureSectionProps {
  title: string
  dividerColor?: string
  spacing?: SectionSpacing
  children: React.ReactNode
}

function TreasureSection({
  title,
  dividerColor,
  spacing = 'stacked',
  children,
}: TreasureSectionProps): JSX.Element {
  return (
    <div className={cx('treasure-section', `treasure-section--${spacing}`)}>
      <h4>{title}</h4>
      <Divider spacingBottom="sm" color={dividerColor} />
      {children}
    </div>
  )
}

export default TreasureSection
