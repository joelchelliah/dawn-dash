import { useEffect } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { logger } from '@/shared/utils/logger'

import {
  findUnknownRewards,
  findUnmappedPools,
  TREASURE_POOL_DISPLAYS,
} from '@/codex/constants/treasurePools'

import PanelHeader from '../../PanelHeader'

import TreasurePool from './TreasurePool'
import styles from './index.module.scss'

const cx = createCx(styles)

const TreasurePoolsPanel = () => {
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
    <div className={cx('treasure-panel')}>
      <div className={cx('treasure-panel__header')}>
        <PanelHeader type="TreasurePools" />
      </div>

      <div className={cx('treasure-panel__container')}>
        <div className={cx('treasure-panel__pools')}>
          {TREASURE_POOL_DISPLAYS.map((pool) => (
            <TreasurePool key={pool.id} pool={pool} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TreasurePoolsPanel
