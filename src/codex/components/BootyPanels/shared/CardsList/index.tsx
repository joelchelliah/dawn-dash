import RarityBorderedArtwork, { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'
import { HOVER_TRIGGER } from '@/shared/utils/hoverTrigger'
import { splitCamelCaseWords } from '@/shared/utils/textHelper'

import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_BORDER_OPACITY = 75

export interface CardListArtwork {
  height: number
  heightMobile: number
  width: number
  widthMobile: number
}

const SQUARE_ARTWORK: CardListArtwork = {
  height: 48,
  heightMobile: 44,
  width: 48,
  widthMobile: 44,
}

/*
 * The neutral shape the grid renders. Treasures and special weapons carry different data around
 * them, so each panel maps its own rows down to this rather than the list knowing either type.
 */
export interface CardListItem {
  id: number
  name: string
  rarity: number
  category: number
  categoryString: string
}

interface CardListProps {
  items: CardListItem[]
  artwork?: CardListArtwork
  onSelect?: (id: number) => void
}

function CardList({ items, artwork = SQUARE_ARTWORK, onSelect }: CardListProps): JSX.Element {
  return (
    <div className={cx('cards-list-container')}>
      <div className={cx('cards-list')}>
        {items.map((item) => (
          <CardListRow
            key={item.id}
            item={item}
            artwork={artwork}
            onSelect={onSelect && (() => onSelect(item.id))}
          />
        ))}
      </div>
    </div>
  )
}

interface CardListRowProps {
  item: CardListItem
  artwork: CardListArtwork
  onSelect?: () => void
}

function CardListRow({ item, artwork, onSelect }: CardListRowProps): JSX.Element {
  const rarity = RARITIES[item.rarity]
  const rarityAndCategory = [rarity?.name, splitCamelCaseWords(item.categoryString)]
    .filter(Boolean)
    .join(' ')

  // Without a select handler the row still hovers, but must not advertise itself as a control
  const interactionProps = onSelect
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: onSelect,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        },
      }
    : {}

  return (
    <div
      className={cx('cards-list-item', HOVER_TRIGGER, {
        'cards-list-item--clickable': Boolean(onSelect),
      })}
      {...interactionProps}
    >
      <RarityBorderedArtwork
        cardName={item.name}
        rarity={item.rarity}
        category={item.category}
        size={artwork.height}
        sizeMobile={artwork.heightMobile}
        width={artwork.width}
        widthMobile={artwork.widthMobile}
        borderOpacity={ARTWORK_BORDER_OPACITY}
      />
      <div className={cx('cards-list-item__text')}>
        <span className={cx('cards-list-item__name')}>{item.name}</span>
        {rarityAndCategory && (
          <span
            className={cx('cards-list-item__rarity', {
              [`cards-list-item__rarity--${rarity?.slug}`]: Boolean(rarity),
            })}
          >
            {rarityAndCategory}
          </span>
        )}
      </div>
    </div>
  )
}

export default CardList
