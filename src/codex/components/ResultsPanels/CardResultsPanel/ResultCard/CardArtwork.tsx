import Image from '@/shared/components/Image'
import { useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'

import styles from './CardArtwork.module.scss'

const cx = createCx(styles)

// Keep in sync with `$artwork-size` / `$artwork-size-mobile` in CardArtwork.module.scss.
// Hard ceiling of 70: the source webps are 70x70, so anything larger upscales.
const ARTWORK_SIZE = 48
const ARTWORK_SIZE_MOBILE = 40

const indexToRarityBorderClassMap = {
  [0]: 'card-artwork--common',
  [1]: 'card-artwork--uncommon',
  [2]: 'card-artwork--rare',
  [3]: 'card-artwork--legendary',
  [4]: 'card-artwork--monster',
}

interface CardArtworkProps {
  card: CardData
}

const CardArtwork = ({ card }: CardArtworkProps) => {
  /**
   * Passing `null` as the fallback opts out of the hook's `PestilenceDecreeUrl` default: an
   * unresolved card renders the rarity-tinted placeholder square.
   */
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(card.name, null, card.category)
  const { isMobile } = useBreakpoint()

  const className = cx(
    'card-artwork',
    indexToRarityBorderClassMap[card.rarity as keyof typeof indexToRarityBorderClassMap]
  )

  if (!cardImageSrc) return <div className={className} />

  // Matches the stylesheet's breakpoint, so the reserved box never disagrees with the painted one.
  const size = isMobile ? ARTWORK_SIZE_MOBILE : ARTWORK_SIZE

  return (
    <Image
      className={className}
      src={cardImageSrc}
      alt={card.name}
      width={size}
      height={size}
      onError={onImageSrcError}
    />
  )
}

export default CardArtwork
