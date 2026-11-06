import {
  CircleIcon,
  DoubleStarsIcon,
  SingleStarIcon,
  SkullIcon,
  TripleStarsIcon,
} from '@/shared/components/Icons'
import { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

const RARITY_ICONS: Record<number, typeof CircleIcon> = {
  0: CircleIcon,
  1: SingleStarIcon,
  2: DoubleStarsIcon,
  3: TripleStarsIcon,
  4: SkullIcon,
}

const RarityLabel = ({ rarity }: { rarity: number }) => {
  const Icon = RARITY_ICONS[rarity]
  const slug = RARITIES[rarity]?.slug

  return (
    <span className={cx('rarity-label', { [`rarity-label--${slug}`]: Boolean(slug) })}>
      {Icon && <Icon className={cx('rarity-label__icon')} />}
      {RARITIES[rarity]?.name}
    </span>
  )
}

export default RarityLabel
