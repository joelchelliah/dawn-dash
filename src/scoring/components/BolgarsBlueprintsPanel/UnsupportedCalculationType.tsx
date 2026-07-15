import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface UnsupportedCalculationTypeProps {
  calculationType: string
}

function UnsupportedCalculationType({
  calculationType,
}: UnsupportedCalculationTypeProps): JSX.Element {
  return (
    <div className={cx('unavailable')}>
      <p>
        ⚠️ The score calculation type for this challenge is &quot;
        <strong>{calculationType}</strong>&quot;. This section is not yet supported for that type.
      </p>
    </div>
  )
}

export default UnsupportedCalculationType
