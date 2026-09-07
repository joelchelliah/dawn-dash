import GradientDivider from '@/shared/components/GradientDivider'
import { createCx } from '@/shared/utils/classnames'

import styles from './TreasureSection.module.scss'

const cx = createCx(styles)

interface TreasureSectionProps {
  title: string
  children: React.ReactNode
}

function TreasureSection({ title, children }: TreasureSectionProps): JSX.Element {
  return (
    <div className={cx('treasure-section')}>
      <h4>{title}</h4>
      <GradientDivider spacingBottom="sm" />
      {children}
    </div>
  )
}

export default TreasureSection
