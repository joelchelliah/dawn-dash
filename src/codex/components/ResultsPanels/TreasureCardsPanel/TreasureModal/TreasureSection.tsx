import Divider from '@/shared/components/Divider'
import { createCx } from '@/shared/utils/classnames'

import styles from './TreasureSection.module.scss'

const cx = createCx(styles)

interface TreasureSectionProps {
  title: string
  dividerColor?: string
  children: React.ReactNode
}

function TreasureSection({ title, dividerColor, children }: TreasureSectionProps): JSX.Element {
  return (
    <div className={cx('treasure-section')}>
      <h4>{title}</h4>
      <Divider spacingBottom="sm" color={dividerColor} />
      {children}
    </div>
  )
}

export default TreasureSection
