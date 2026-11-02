import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'

import styles from './CardMetadata.module.scss'

const cx = createCx(styles)

interface CardMetadataProps {
  card: CardData
  shouldShowCardSet: boolean
  shouldShowCardType: boolean
  getCardSetNameFromIndex?: (index: number) => string
  getCardTypeNameFromIndex?: (index: number) => string
  getCardTypeEmojiFromIndex?: (index: number) => string
}

const CardMetadata = ({
  card,
  shouldShowCardSet,
  shouldShowCardType,
  getCardSetNameFromIndex,
  getCardTypeNameFromIndex,
  getCardTypeEmojiFromIndex,
}: CardMetadataProps) => {
  const cardSetName = shouldShowCardSet ? getCardSetNameFromIndex?.(card.expansion) : undefined
  const cardTypeName = shouldShowCardType ? getCardTypeNameFromIndex?.(card.type) : undefined
  const cardTypeEmoji = shouldShowCardType ? getCardTypeEmojiFromIndex?.(card.type) : undefined
  const showCardSet = cardSetName !== undefined
  const showCardType = cardTypeName !== undefined && cardTypeEmoji !== undefined

  if (!showCardSet && !showCardType) return null

  return (
    <span className={cx('card-metadata')}>
      {showCardType && (
        <span className={cx('card-metadata__card-type')} title={cardTypeName}>
          {cardTypeEmoji}
        </span>
      )}
      {showCardSet && showCardType && <span className={cx('card-metadata__divider')} />}
      {showCardSet && (
        <span className={cx('card-metadata__card-set')}>
          {cardSetName}
          {/* Marks cards from the nil (0) expansion, which are shown as Core cards */}
          {card.expansion === 0 && <span className={cx('card-metadata__card-set__nil')}>°</span>}
        </span>
      )}
    </span>
  )
}

export default CardMetadata
