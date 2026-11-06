import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

const BANNER_NAMES: Record<number, string> = {
  1: 'Green',
  2: 'Blue',
  3: 'Red',
  4: 'Purple',
  5: 'Brown',
  6: 'Aqua',
  7: 'White',
  8: 'Gold',
  9: 'Black',
  10: 'Orange',
  11: 'Monster',
}

export const getBannerName = (color: number) => BANNER_NAMES[color] ?? ''

const BannerPill = ({ color }: { color: number }) => (
  <span className={cx('banner-pill', `banner-pill--${color}`)}>{getBannerName(color)} banner</span>
)

export default BannerPill
