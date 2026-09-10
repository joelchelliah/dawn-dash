import { useFocusBand } from '@/shared/hooks/useFocusBand'
import { createCx } from '@/shared/utils/classnames'
import { FOCUS_TRIGGER, HOVER_TRIGGER } from '@/shared/utils/hoverTrigger'

import {
  getPoolRewards,
  getPoolSize,
  getPoolSources,
  TreasurePoolDisplay,
} from '@/codex/constants/treasurePools'
import Section from '@/codex/components/shared/Section'

import WhirlpoolArtwork from '../WhirlpoolArtwork'

import styles from './index.module.scss'
import { POOL_NOTES } from './poolNotes'

const cx = createCx(styles)

const ARTWORK_SIZE = 40
const ARTWORK_SIZE_MOBILE = 32

interface TreasurePoolProps {
  pool: TreasurePoolDisplay
}

function TreasurePool({ pool }: TreasurePoolProps): JSX.Element {
  const rewards = getPoolRewards(pool)
  const sources = getPoolSources(pool)
  const notes = POOL_NOTES[pool.id]
  const { ref, isInFocusBand } = useFocusBand<HTMLDivElement>()

  const cardClassName = cx('pool', HOVER_TRIGGER, { [FOCUS_TRIGGER]: isInFocusBand })
  // The artwork size is published on the card, not just handed to the whirlpool, because the header
  // gap is a fraction of it — see `$header-gap-*` in the stylesheet.
  const cardStyle = {
    '--pool-color': pool.color,
    '--pool-color-accent': pool.colorAccent,
    '--pool-artwork-size': `${ARTWORK_SIZE}px`,
    '--pool-artwork-size-mobile': `${ARTWORK_SIZE_MOBILE}px`,
  } as React.CSSProperties

  return (
    <div className={cardClassName} style={cardStyle}>
      <div ref={ref} className={cx('pool__header')}>
        <WhirlpoolArtwork
          src={pool.imageSrc}
          alt={pool.name}
          size={ARTWORK_SIZE}
          sizeMobile={ARTWORK_SIZE_MOBILE}
          color={pool.color}
          colorAccent={pool.colorAccent}
        />
        <div className={cx('pool__header-text')}>
          <span className={cx('pool__name')}>{pool.name}</span>
          <span className={cx('pool__size')}>{getPoolSize(pool)} cards</span>
        </div>
      </div>

      {notes.above && (
        <div className={cx('pool__note')}>
          <p>{notes.above}</p>
        </div>
      )}

      <Section title="Contains" dividerColor="var(--pool-color)" spacing="none">
        <div className={cx('pool__tags')}>
          {rewards.map(({ label, excluded }) => (
            <span key={label} className={cx('pool__tag', { 'pool__tag--excluded': excluded })}>
              {label}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Used by" dividerColor="var(--pool-color)" spacing="none">
        <div className={cx('pool__tags')}>
          {sources.map((source) => (
            <span key={source} className={cx('pool__tag')}>
              {source}
            </span>
          ))}
        </div>
      </Section>

      <div className={cx('pool__note')}>{notes.below && <p>{notes.below}</p>}</div>
    </div>
  )
}

export default TreasurePool
