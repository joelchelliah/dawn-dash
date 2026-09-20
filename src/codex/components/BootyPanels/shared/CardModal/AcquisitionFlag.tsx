import { CheckIcon, CrossIcon } from '@/shared/components/Icons'
import { createCx } from '@/shared/utils/classnames'

import styles from './AcquisitionFlag.module.scss'

const cx = createCx(styles)

export interface Acquisition {
  label: string
  value: boolean
}

function AcquisitionFlag({ label, value }: Acquisition): JSX.Element {
  return (
    <div className={cx('acquisition-flag', { 'acquisition-flag--off': !value })}>
      {value ? (
        <CheckIcon className={cx('acquisition-flag__icon')} />
      ) : (
        <CrossIcon className={cx('acquisition-flag__icon')} />
      )}
      <span className={cx('acquisition-flag__label')}>{label}</span>
    </div>
  )
}

export default AcquisitionFlag
