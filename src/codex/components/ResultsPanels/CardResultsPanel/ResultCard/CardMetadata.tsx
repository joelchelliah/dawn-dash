import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'

import styles from './CardMetadata.module.scss'

const cx = createCx(styles)

interface CardMetadataProps {
  card: CardData
  shouldShowCardSet: boolean
  shouldShowCardType: boolean
  getCardSetNameFromIndex: (index: number) => string
  getCardTypeNameFromIndex: (index: number) => string
  getCardTypeEmojiFromIndex: (index: number) => string
}

const CardMetadata = ({
  card,
  shouldShowCardSet,
  shouldShowCardType,
  getCardSetNameFromIndex,
  getCardTypeNameFromIndex,
  getCardTypeEmojiFromIndex,
}: CardMetadataProps) => {
  if (!shouldShowCardSet && !shouldShowCardType) return null

  return (
    <span className={cx('card-metadata')}>
      {shouldShowCardType && (
        <span
          className={cx('card-metadata__card-type')}
          title={getCardTypeNameFromIndex(card.type)}
        >
          {getCardTypeEmojiFromIndex(card.type)}
        </span>
      )}
      {shouldShowCardSet && shouldShowCardType && <span className={cx('card-metadata__divider')} />}
      {shouldShowCardSet && (
        <span className={cx('card-metadata__card-set')}>
          {getCardSetNameFromIndex(card.expansion)}
          {/* Marks cards from the nil (0) expansion, which are shown as Core cards */}
          {card.expansion === 0 && <span className={cx('card-metadata__card-set__nil')}>°</span>}
        </span>
      )}
    </span>
  )
}

export default CardMetadata
