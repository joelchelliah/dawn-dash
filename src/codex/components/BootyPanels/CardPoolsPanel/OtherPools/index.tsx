import { createCx } from '@/shared/utils/classnames'

import { getOtherPools, POOL_COLOR_CYCLE } from '@/codex/constants/treasurePools'

import PoolSourceList from '../../shared/PoolSourceList'

import styles from './index.module.scss'

const cx = createCx(styles)

const CYCLE_DURATION_SECONDS = 5

const OTHER_POOLS = getOtherPools()

export const OTHER_POOL_COUNT = OTHER_POOLS.length

const COLOR_VARIABLES = Object.fromEntries(
  POOL_COLOR_CYCLE.flatMap(({ color, colorAccent }, index) => [
    [`--pool-color-${index + 1}`, color],
    [`--pool-color-accent-${index + 1}`, colorAccent],
  ])
)

function OtherPools(): JSX.Element {
  const containerStyle = {
    ...COLOR_VARIABLES,
    '--cycle-duration': `${CYCLE_DURATION_SECONDS}s`,
  } as React.CSSProperties

  return (
    <div className={cx('other-pools')} style={containerStyle}>
      <div className={cx('other-pools__head')}>
        <span className={cx('other-pools__head-cell')}>Pool</span>
        <span className={cx('other-pools__head-cell')}>Used by</span>
      </div>

      {OTHER_POOLS.map(({ name, sources }, index) => {
        const rowStyle = {
          '--pool-accent': `var(--pool-color-accent-${(index % POOL_COLOR_CYCLE.length) + 1})`,
          '--rarity-color': 'var(--pool-accent)',
        } as React.CSSProperties

        return (
          <div key={name} className={cx('other-pools__row')} style={rowStyle}>
            <span className={cx('other-pools__name')}>{name}</span>
            <div className={cx('other-pools__sources')}>
              <PoolSourceList sources={sources} layout="pool-table" unshaded />
            </div>
          </div>
        )
      })}

      <span className={cx('other-pools__note')}>
        Pool sizes vary greatly depending on class, attributes, and which card sets are enabled.
        Some events/cards may have additional hidden restrictions.
      </span>
    </div>
  )
}

export default OtherPools
