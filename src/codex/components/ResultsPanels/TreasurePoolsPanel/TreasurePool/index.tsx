import { createCx } from '@/shared/utils/classnames'

import { getPoolSize, TreasurePoolDisplay } from '@/codex/constants/treasurePools'
import TreasureSection from '@/codex/components/shared/TreasureSection'

import WhirlpoolArtwork, { WHIRLPOOL_HOVER_TRIGGER } from '../WhirlpoolArtwork'

import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 48
const ARTWORK_SIZE_MOBILE = 42

interface TreasurePoolProps {
  pool: TreasurePoolDisplay
}

function TreasurePool({ pool }: TreasurePoolProps): JSX.Element {
  const cardClassName = `${cx('pool-card')} ${WHIRLPOOL_HOVER_TRIGGER}`

  // The accent colour reaches the stylesheet as a variable, so the name, dividers and border all
  // follow the pool's own colour without a rule per pool.
  const cardStyle = {
    '--pool-colour': pool.colour,
    '--pool-colour-bright': pool.colourBright,
  } as React.CSSProperties

  return (
    <div className={cardClassName} style={cardStyle}>
      <div className={cx('pool-card__header')}>
        <WhirlpoolArtwork
          src={pool.imageSrc}
          alt={pool.name}
          size={ARTWORK_SIZE}
          sizeMobile={ARTWORK_SIZE_MOBILE}
          colour={pool.colour}
          colourBright={pool.colourBright}
        />
        <div className={cx('pool-card__header-text')}>
          <span className={cx('pool-card__name')}>{pool.name}</span>
          <span className={cx('pool-card__size')}>{getPoolSize(pool)} cards</span>
        </div>
      </div>

      <TreasureSection title="Rewards" dividerColor="var(--pool-colour)" spacing="none">
        <div className={cx('pool-card__tags')}>
          {pool.rewards.map(({ label, excluded }) => (
            <span
              key={label}
              className={cx('pool-card__tag', { 'pool-card__tag--excluded': excluded })}
            >
              {label}
            </span>
          ))}
        </div>
      </TreasureSection>

      <div className={cx('pool-card__acquired')}>
        <TreasureSection title="Acquired from" dividerColor="var(--pool-colour)" spacing="none">
          <div className={cx('pool-card__tags')}>
            {pool.sources.map((source) => (
              <span key={source} className={cx('pool-card__tag')}>
                {source}
              </span>
            ))}
          </div>
        </TreasureSection>
      </div>
    </div>
  )
}

export default TreasurePool
