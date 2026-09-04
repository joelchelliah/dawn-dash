import RarityBorderedArtwork from '@/shared/components/RarityBorderedArtwork'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'

import styles from './CardArtwork.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 48
const ARTWORK_SIZE_MOBILE = 40

interface CardArtworkProps {
  card: CardData
}

const CardArtwork = ({ card }: CardArtworkProps) => {
  const { isMobile } = useBreakpoint()

  return (
    <RarityBorderedArtwork
      cardName={card.name}
      rarity={card.rarity}
      category={card.category}
      size={isMobile ? ARTWORK_SIZE_MOBILE : ARTWORK_SIZE}
      sizeMobile={ARTWORK_SIZE_MOBILE}
      className={cx('card-artwork')}
    />
  )
}

export default CardArtwork
