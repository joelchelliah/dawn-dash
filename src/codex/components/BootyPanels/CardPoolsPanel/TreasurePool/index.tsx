import { useFocusBand } from '@/shared/hooks/useFocusBand'
import { createCx } from '@/shared/utils/classnames'
import { FOCUS_TRIGGER, HOVER_TRIGGER, HOVER_TRIGGER_SHALLOW } from '@/shared/utils/hoverTrigger'

import {
  getPoolName,
  getPoolRewards,
  getPoolSize,
  getPoolSources,
  TreasurePoolDisplay,
} from '@/codex/constants/treasurePools'
import Section from '@/codex/components/shared/Section'

import PoolSourceList from '../../shared/PoolSourceList'
import WhirlpoolArtwork from '../WhirlpoolArtwork'

import styles from './index.module.scss'
import { POOL_NOTES } from './poolNotes'

const cx = createCx(styles)

const WHIRLPOOL_ARTWORK_SIZE = 40
const WHIRLPOOL_ARTWORK_SIZE_MOBILE = 32

interface TreasurePoolProps {
  pool: TreasurePoolDisplay
}

function TreasurePool({ pool }: TreasurePoolProps): JSX.Element {
  const name = getPoolName(pool)
  const rewards = getPoolRewards(pool)
  const sources = getPoolSources(pool)
  const notes = POOL_NOTES[pool.id]
  const { ref, isInFocusBand } = useFocusBand<HTMLDivElement>()

  const allowLargerMobileArtwork = sources.length <= 2

  const cardClassName = cx('pool', HOVER_TRIGGER, HOVER_TRIGGER_SHALLOW, {
    [FOCUS_TRIGGER]: isInFocusBand,
  })
  const cardStyle = {
    '--pool-color': pool.color,
    '--pool-color-accent': pool.colorAccent,
  } as React.CSSProperties

  return (
    <div className={cardClassName} style={cardStyle}>
      <div ref={ref} className={cx('pool__header')}>
        <WhirlpoolArtwork
          src={pool.imageSrc}
          alt={name}
          size={WHIRLPOOL_ARTWORK_SIZE}
          sizeMobile={WHIRLPOOL_ARTWORK_SIZE_MOBILE}
          color={pool.color}
          colorAccent={pool.colorAccent}
        />
        <div className={cx('pool__header-text')}>
          <span className={cx('pool__name')}>{name}</span>
          <span className={cx('pool__size')}>{getPoolSize(pool)} cards</span>
        </div>
      </div>

      {notes.above && (
        <div className={cx('pool__note')}>
          <p>{notes.above}</p>
        </div>
      )}

      <Section title="Contains" dividerColor="var(--pool-color)" spacing="small">
        <div className={cx('pool__tags')}>
          {rewards.map(({ label, excluded }) => (
            <span key={label} className={cx('pool__tag', { 'pool__tag--excluded': excluded })}>
              {label}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Used by" dividerColor="var(--pool-color)" spacing="small">
        <PoolSourceList
          sources={sources}
          layout="pool-table"
          allowLargerMobileArtwork={allowLargerMobileArtwork}
        />
      </Section>

      <div className={cx('pool__note')}>{notes.below && <p>{notes.below}</p>}</div>
    </div>
  )
}

export default TreasurePool
