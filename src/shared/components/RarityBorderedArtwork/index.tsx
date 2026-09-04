import Image from '@/shared/components/Image'
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

// Put this on whichever ancestor owns the hover
export const RARITY_BORDERED_ARTWORK_HOVER_TRIGGER = 'rarity-artwork-hoverable'

// Put this on the same ancestor to grey the artwork out
export const RARITY_BORDERED_ARTWORK_STRUCK_TRIGGER = 'rarity-artwork-struck'

// Full-strength border, i.e. the rarity colour as-is.
const DEFAULT_BORDER_OPACITY = 100

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
  borderOpacity = DEFAULT_BORDER_OPACITY,
  className,
}: RarityArtworkProps) => {
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(cardName, null, category)

  const raritySlug = RARITIES[rarity]?.slug
  const artworkClassName = `${cx('rarity-artwork', {
    [`rarity-artwork--${raritySlug}`]: Boolean(raritySlug),
  })}${className ? ` ${className}` : ''}`

  const artworkStyle = {
    '--artwork-size': `${size}px`,
    '--artwork-size-mobile': `${sizeMobile ?? size}px`,
    '--border-opacity': `${borderOpacity}%`,
  } as React.CSSProperties

  if (!cardImageSrc) return <div className={artworkClassName} style={artworkStyle} />

  return (
    <Image
      className={artworkClassName}
      style={artworkStyle}
      src={cardImageSrc}
      alt={cardName}
      width={size}
      height={size}
      onError={onImageSrcError}
    />
  )
}

export default RarityBorderedArtwork
