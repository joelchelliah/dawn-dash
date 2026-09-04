import RarityBorderedArtwork, {
  RARITIES,
  RARITY_BORDERED_ARTWORK_HOVER_TRIGGER,
} from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'

import { EnrichedTreasureCard } from '@/codex/types/treasures'

import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 48
const ARTWORK_SIZE_MOBILE = 44
const ARTWORK_BORDER_OPACITY = 70

interface TreasureListProps {
  treasures: EnrichedTreasureCard[]
}

function TreasureList({ treasures }: TreasureListProps): JSX.Element {
  return (
    <div className={cx('treasure-list-container')}>
      <div className={cx('treasure-list')}>
        {treasures.map((treasure) => (
          <TreasureListItem key={treasure.treasureDetails.id} treasure={treasure} />
        ))}
      </div>
    </div>
  )
}

interface TreasureListItemProps {
  treasure: EnrichedTreasureCard
}

function TreasureListItem({ treasure }: TreasureListItemProps): JSX.Element {
  const { treasureDetails, cardDetails } = treasure
  const rarity = RARITIES[cardDetails.rarity]

  // The trigger marker is what lets the row's hover drive the artwork's pop and glow — the shared
  // component can't see this module's hashed class names.
  const itemClassName = `${cx('treasure-list-item')} ${RARITY_BORDERED_ARTWORK_HOVER_TRIGGER}`

  return (
    <div className={itemClassName}>
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
        {rarity && (
          <span
            className={cx(
              'treasure-list-item__rarity',
              `treasure-list-item__rarity--${rarity.slug}`
            )}
          >
            {rarity.name}
          </span>
        )}
      </div>
    </div>
  )
}

export default TreasureList
