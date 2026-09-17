import { useEffect } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { logger } from '@/shared/utils/logger'

import {
  findUnknownRewards,
  findUnmappedPools,
  TREASURE_POOL_DISPLAYS,
} from '@/codex/constants/treasurePools'

import TreasureBasePanel from '../TreasureBasePanel'

import TreasurePool from './TreasurePool'
import styles from './index.module.scss'

const cx = createCx(styles)

const CardPoolsPanel = () => {
  useEffect(() => {
    const unmapped = findUnmappedPools()

    if (unmapped.length > 0) {
      logger.warn(
        `Treasure pools missing from TREASURE_POOL_DISPLAYS: ${unmapped.join(', ')}. ` +
          'Add them in constants/treasurePools.ts'
      )
    }

    const unknown = findUnknownRewards()

    if (unknown.length > 0) {
      logger.warn(
        `Treasure pool categories missing from KNOWN_REWARDS: ${unknown.join(', ')}. ` +
          'Check they read well as a reward tag, then add them in constants/treasurePools.ts'
      )
    }
  }, [])

  return (
    <TreasureBasePanel type="CardPools">
      <span className={cx('pools-info')}>
        Randomly acquired <strong>Treasure</strong> cards are drawn from one of these{' '}
        {TREASURE_POOL_DISPLAYS.length} <strong>Card Pools</strong>.
      </span>
      <div className={cx('pools')}>
        {TREASURE_POOL_DISPLAYS.map((pool) => (
          <TreasurePool key={pool.id} pool={pool} />
        ))}
      </div>

      <span className={cx('pools-info')}>
        Other <strong>Card Pools</strong> used by cards, talents and events when producing a random
        reward.
      </span>
    </TreasureBasePanel>
  )
}

export default CardPoolsPanel
