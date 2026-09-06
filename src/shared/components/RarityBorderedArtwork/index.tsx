import BorderedArtwork from '@/shared/components/BorderedArtwork'
import { useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

export const RARITIES: Record<number, { name: string; slug: string }> = {
  [0]: { name: 'Common', slug: 'common' },
  [1]: { name: 'Uncommon', slug: 'uncommon' },
  [2]: { name: 'Rare', slug: 'rare' },
  [3]: { name: 'Legendary', slug: 'legendary' },
  [4]: { name: 'Monster', slug: 'monster' },
}

interface RarityArtworkProps {
  cardName: string
  rarity: number
  category?: number
  size: number
  sizeMobile?: number
  borderOpacity?: number
  className?: string
}

const RarityBorderedArtwork = ({
  cardName,
  rarity,
  category,
  size,
  sizeMobile,
  borderOpacity,
  className,
}: RarityArtworkProps) => {
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(cardName, null, category)

  const raritySlug = RARITIES[rarity]?.slug
  const rarityClassName = `${cx('rarity-artwork', {
    [`rarity-artwork--${raritySlug}`]: Boolean(raritySlug),
  })}${className ? ` ${className}` : ''}`

  return (
    <BorderedArtwork
      src={cardImageSrc}
      alt={cardName}
      size={size}
      sizeMobile={sizeMobile}
      borderOpacity={borderOpacity}
      onImageSrcError={onImageSrcError}
      className={rarityClassName}
    />
  )
}

export default RarityBorderedArtwork
