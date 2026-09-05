import RarityBorderedArtwork, {
  RARITIES,
  RARITY_BORDERED_ARTWORK_HOVER_TRIGGER,
} from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'

import { CARD_CATEGORIES } from '@/codex/constants/cardCategories'
import { EnrichedTreasureCard } from '@/codex/types/treasures'

import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 48
const ARTWORK_SIZE_MOBILE = 44
const ARTWORK_BORDER_OPACITY = 75

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
  const category = CARD_CATEGORIES[cardDetails.category]
  const rarityAndCategory = [rarity?.name, category].filter(Boolean).join(' ')

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
