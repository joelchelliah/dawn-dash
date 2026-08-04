import {
  CircleIcon,
  SingleStarIcon,
  DoubleStarsIcon,
  TripleStarsIcon,
  SkullIcon,
  CrossIcon,
  PawIcon,
} from '@/shared/components/Icons'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'
import { isNonCollectible, isAnimalCompanionCard } from '@/codex/utils/cardHelper'

import styles from './CardIcons.module.scss'

const cx = createCx(styles)

const indexToRarityIconMap = {
  [0]: <CircleIcon className={cx('card-icons__rarity--common')} />,
  [1]: <SingleStarIcon className={cx('card-icons__rarity--uncommon')} />,
  [2]: <DoubleStarsIcon className={cx('card-icons__rarity--rare')} />,
  [3]: <TripleStarsIcon className={cx('card-icons__rarity--legendary')} />,
  [4]: <SkullIcon className={cx('card-icons__rarity--monster')} />,
}

/*
 * Sets `--rarity-colour` on the column so every plate's border inherits it — the rarity class itself
 * sits on the glyph, which is too deep for the plates to key off. Mirrors `CardArtwork`'s border.
 */
const indexToRarityClassMap = {
  [0]: 'card-icons--common',
  [1]: 'card-icons--uncommon',
  [2]: 'card-icons--rare',
  [3]: 'card-icons--legendary',
  [4]: 'card-icons--monster',
}

interface CardIconsProps {
  card: CardData
  shouldIncludeNonCollectibleCards: boolean
  shouldIncludeAnimalCompanionCards: boolean
  shouldOverlapWithCardArt: boolean
}

const CardIcons = ({
  card,
  shouldIncludeNonCollectibleCards,
  shouldIncludeAnimalCompanionCards,
  shouldOverlapWithCardArt,
}: CardIconsProps) => {
  const renderSpecialIcons = () => {
    const hasNonCollectible = shouldIncludeNonCollectibleCards && isNonCollectible(card)
    const hasAnimalCompanion = shouldIncludeAnimalCompanionCards && isAnimalCompanionCard(card)

    if (hasNonCollectible && hasAnimalCompanion) {
      return (
        <span className={cx('card-icons__non-collectible-and-animal-companion')}>
          <PawIcon />
          <CrossIcon />
        </span>
      )
    }

    if (hasAnimalCompanion) {
      return (
        <span className={cx('card-icons__animal-companion')}>
          <PawIcon />
        </span>
      )
    }

    if (hasNonCollectible) {
      return (
        <span className={cx('card-icons__non-collectible')}>
          <CrossIcon />
        </span>
      )
    }

    return null
  }

  return (
    <span
      className={cx(
        'card-icons',
        indexToRarityClassMap[card.rarity as keyof typeof indexToRarityClassMap],
        {
          'card-icons--overlapping': shouldOverlapWithCardArt,
        }
      )}
    >
      {/* Wrapper carries the circular plate while overlapping; the svg keeps its own size. */}
      <span className={cx('card-icons__rarity-wrapper')}>
        {indexToRarityIconMap[card.rarity as keyof typeof indexToRarityIconMap]}
      </span>
      {renderSpecialIcons()}
    </span>
  )
}

export default CardIcons
