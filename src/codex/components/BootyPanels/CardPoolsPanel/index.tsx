import { useEffect } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { logger } from '@/shared/utils/logger'

import {
  findUnknownRewards,
  findUnmappedPools,
  TREASURE_POOL_DISPLAYS,
} from '@/codex/constants/treasurePools'

import TreasureBasePanel from '../TreasureBasePanel'

import OtherPools, { OTHER_POOL_COUNT } from './OtherPools'
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
        All <strong>Treasure</strong> cards can be randomly drawn from one of these{' '}
        <strong>{TREASURE_POOL_DISPLAYS.length}</strong> card pools.
      </span>
      <div className={cx('pools')}>
        {TREASURE_POOL_DISPLAYS.map((pool) => (
          <TreasurePool key={pool.id} pool={pool} />
        ))}
      </div>

      <span className={cx('pools-info')}>
        Some <strong>Treasure</strong> cards and <strong>Special Basic Attacks</strong> can be
        randomly drawn from these <strong>{OTHER_POOL_COUNT}</strong> card pools.
      </span>
      <OtherPools />
    </TreasureBasePanel>
  )
}

export default CardPoolsPanel
