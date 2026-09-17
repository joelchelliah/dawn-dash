import { createCx } from '@/shared/utils/classnames'

import { getOtherPools, POOL_COLOR_CYCLE } from '@/codex/constants/treasurePools'

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
      {OTHER_POOLS.map(({ name, sources }, index) => {
        const nameStyle = {
          color: `var(--pool-color-accent-${(index % POOL_COLOR_CYCLE.length) + 1})`,
        } as React.CSSProperties

        return (
          <div key={name} className={cx('other-pools__row')}>
            <span className={cx('other-pools__name')} style={nameStyle}>
              {name}
            </span>
            <div className={cx('other-pools__sources')}>
              {sources.map(({ name: sourceName, sourceType }) => (
                <span key={`${sourceName}-${sourceType}`} className={cx('other-pools__source')}>
                  {sourceName}{' '}
                  <span className={cx('other-pools__source-type')}>({sourceType})</span>
                </span>
              ))}
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
