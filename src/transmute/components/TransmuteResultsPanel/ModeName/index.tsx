import { createCx } from '@/shared/utils/classnames'

import { TransmuteMode } from '@/transmute/types/rules'

import styles from './index.module.scss'

const cx = createCx(styles)

const MODE_NAMES: Record<TransmuteMode, string> = {
  transmute: 'Transmute',
  sidemute: 'Sidemute',
  tradepost: 'Tradepost',
}

const ModeName = ({ mode }: { mode: TransmuteMode }) => (
  <span className={cx('mode')}>{MODE_NAMES[mode]}</span>
)

export default ModeName
