import { memo } from 'react'

import { createCx } from '@/shared/utils/classnames'

import styles from './CardStrikeBadge.module.scss'

const cx = createCx(styles)

const CHECK_PATH =
  'M2.91,11.94 L9.19,21.02 L11.26,20.83 L23.15,1.48 L22.45,0.92 L9.77,15.96 L3.49,11.26 Z'

const CardStrikeBadge = () => (
  <span className={cx('card-strike-badge')} aria-hidden="true">
    <svg className={cx('card-strike-badge__check')} viewBox="0 0 24 24">
      <path d={CHECK_PATH} />
    </svg>
  </span>
)

export default memo(CardStrikeBadge)
