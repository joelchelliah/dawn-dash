import { createCx } from '@/shared/utils/classnames'

import {
  getPoolRewards,
  getPoolSize,
  getPoolSources,
  TreasurePoolDisplay,
} from '@/codex/constants/treasurePools'
import Section from '@/codex/components/shared/Section'

import WhirlpoolArtwork, { WHIRLPOOL_HOVER_TRIGGER } from '../WhirlpoolArtwork'

import styles from './index.module.scss'
import { POOL_NOTES } from './poolNotes'

const cx = createCx(styles)

const ARTWORK_SIZE = 48
const ARTWORK_SIZE_MOBILE = 42

interface TreasurePoolProps {
  pool: TreasurePoolDisplay
}

function TreasurePool({ pool }: TreasurePoolProps): JSX.Element {
  const rewards = getPoolRewards(pool)
  const sources = getPoolSources(pool)
  const notes = POOL_NOTES[pool.id]

  const cardClassName = `${cx('pool-card')} ${WHIRLPOOL_HOVER_TRIGGER}`
  const cardStyle = {
    '--pool-color': pool.color,
    '--pool-color-accent': pool.colorAccent,
  } as React.CSSProperties

  return (
    <div className={cardClassName} style={cardStyle}>
      <div className={cx('pool-card__header')}>
        <WhirlpoolArtwork
          src={pool.imageSrc}
          alt={pool.name}
          size={ARTWORK_SIZE}
          sizeMobile={ARTWORK_SIZE_MOBILE}
          color={pool.color}
          colorAccent={pool.colorAccent}
        />
        <div className={cx('pool-card__header-text')}>
          <span className={cx('pool-card__name')}>{pool.name}</span>
          <span className={cx('pool-card__size')}>{getPoolSize(pool)} cards</span>
        </div>
      </div>

      {notes.above && (
        <div className={cx('pool-card__note')}>
          <p>{notes.above}</p>
        </div>
      )}

      <Section title="Rewards" dividerColor="var(--pool-color)" spacing="none">
        <div className={cx('pool-card__tags')}>
          {rewards.map(({ label, excluded }) => (
            <span
              key={label}
              className={cx('pool-card__tag', { 'pool-card__tag--excluded': excluded })}
            >
              {label}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Acquired from" dividerColor="var(--pool-color)" spacing="none">
        <div className={cx('pool-card__tags')}>
          {sources.map((source) => (
            <span key={source} className={cx('pool-card__tag')}>
              {source}
            </span>
          ))}
        </div>
      </Section>

      <div className={cx('pool-card__note')}>{notes.below && <p>{notes.below}</p>}</div>
    </div>
  )
}

export default TreasurePool
