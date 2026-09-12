import { CheckIcon, CrossIcon } from '@/shared/components/Icons'
import { createCx } from '@/shared/utils/classnames'

import styles from './TreasureFlag.module.scss'

const cx = createCx(styles)

interface TreasureFlagProps {
  label: string
  value: boolean
}

function TreasureFlag({ label, value }: TreasureFlagProps): JSX.Element {
  return (
    <div className={cx('treasure-flag', { 'treasure-flag--off': !value })}>
      {value ? (
        <CheckIcon className={cx('treasure-flag__icon')} />
      ) : (
        <CrossIcon className={cx('treasure-flag__icon')} />
      )}
      <span className={cx('treasure-flag__label')}>{label}</span>
    </div>
  )
}

export default TreasureFlag
