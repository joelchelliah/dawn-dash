import Image from '@/shared/components/Image'
import { useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'

import styles from './CardArtwork.module.scss'

const cx = createCx(styles)

// Keep in sync with `$artwork-size` in CardArtwork.module.scss
// Hard ceiling of 70: the source webps are 70x70, so anything larger upscales.
const ARTWORK_SIZE = 42

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
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(card.name, null)

  const className = cx(
    'card-artwork',
    indexToRarityBorderClassMap[card.rarity as keyof typeof indexToRarityBorderClassMap]
  )

  if (!cardImageSrc) return <div className={className} />

  return (
    <Image
      className={className}
      src={cardImageSrc}
      alt={card.name}
      width={ARTWORK_SIZE}
      height={ARTWORK_SIZE}
      onError={onImageSrcError}
    />
  )
}

export default CardArtwork
