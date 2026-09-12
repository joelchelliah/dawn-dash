import { useState } from 'react'

import RarityBorderedArtwork, { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'
import { HOVER_TRIGGER } from '@/shared/utils/hoverTrigger'
import { splitCamelCaseWords } from '@/shared/utils/textHelper'

import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard } from '@/codex/types/treasures'

import TreasureModal from '../TreasureModal'

import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 48
const ARTWORK_SIZE_MOBILE = 44
const ARTWORK_BORDER_OPACITY = 75

interface TreasureListProps {
  treasures: EnrichedTreasureCard[]
  cardData: CardData[] | undefined
}

function TreasureList({ treasures, cardData }: TreasureListProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedTreasure = treasures.find(
    ({ treasureDetails }) => treasureDetails.id === selectedId
  )

  return (
    <div className={cx('treasure-list-container')}>
      <div className={cx('treasure-list')}>
        {treasures.map((treasure) => (
          <TreasureListItem
            key={treasure.treasureDetails.id}
            treasure={treasure}
            onClick={() => setSelectedId(treasure.treasureDetails.id)}
          />
        ))}
      </div>
      {selectedTreasure && (
        <TreasureModal
          treasure={selectedTreasure}
          cardData={cardData}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

interface TreasureListItemProps {
  treasure: EnrichedTreasureCard
  onClick: () => void
}

function TreasureListItem({ treasure, onClick }: TreasureListItemProps): JSX.Element {
  const { treasureDetails, cardDetails } = treasure
  const rarity = RARITIES[cardDetails.rarity]
  const rarityAndCategory = [rarity?.name, splitCamelCaseWords(treasureDetails.category)]
    .filter(Boolean)
    .join(' ')

  const itemClassName = cx('treasure-list-item', HOVER_TRIGGER)

  return (
    <div
      className={itemClassName}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <RarityBorderedArtwork
        cardName={cardDetails.name}
        rarity={cardDetails.rarity}
        category={cardDetails.category}
        size={ARTWORK_SIZE}
        sizeMobile={ARTWORK_SIZE_MOBILE}
        borderOpacity={ARTWORK_BORDER_OPACITY}
      />
      <div className={cx('treasure-list-item__text')}>
        <span className={cx('treasure-list-item__name')}>{treasureDetails.name}</span>
        {rarityAndCategory && (
          <span
            className={cx('treasure-list-item__rarity', {
              [`treasure-list-item__rarity--${rarity?.slug}`]: Boolean(rarity),
            })}
          >
            {rarityAndCategory}
          </span>
        )}
      </div>
    </div>
  )
}

export default TreasureList
