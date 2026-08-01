import { memo, useMemo } from 'react'

import GradientLink from '@/shared/components/GradientLink'
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

import { UseAllCardSearchFilters } from '@/codex/hooks/useSearchFilters'
import { CardData } from '@/codex/types/cards'
import {
  isNonCollectible,
  parseCardDescription,
  isAnimalCompanionCard,
} from '@/codex/utils/cardHelper'

import CardArtwork from './CardArtwork'
import styles from './index.module.scss'

interface ResultCardProps {
  card: CardData
  useSearchFilters: UseAllCardSearchFilters
  showCardsWithoutKeywords: boolean
}

const cx = createCx(styles)

const ResultCard = ({ card, useSearchFilters, showCardsWithoutKeywords }: ResultCardProps) => {
  const {
    parsedKeywords,
    useCardSetFilters,
    useExtraCardFilters,
    useFormattingFilters,
    useCardStrike,
  } = useSearchFilters
  const { getCardSetNameFromIndex } = useCardSetFilters
  const { shouldIncludeNonCollectibleCards, shouldIncludeAnimalCompanionCards } =
    useExtraCardFilters
  const {
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
    shouldShowCardArt,
    shouldShowBlightbaneLink,
    shouldHideTrackedCards,
  } = useFormattingFilters
  const { isCardStruck, toggleCardStrike } = useCardStrike

  const matchingKeywordsText = useMemo(() => {
    const matches = parsedKeywords.filter(
      (keyword) =>
        card.name.toLowerCase().includes(keyword.toLowerCase()) ||
        card.description.toLowerCase().includes(keyword.toLowerCase())
    )

    return `{ ${matches.join(', ')} }`
  }, [parsedKeywords, card.name, card.description])

  const isFullMatch = parsedKeywords.some(
    (keyword) => card.name.toLowerCase() === keyword.toLowerCase()
  )
  const isStruck = isCardStruck(card)

  const cardContainerClassName = cx('result-card', {
    'result-card--struck': isStruck,
    'result-card--full-match': isFullMatch,
    'result-card--hidden': shouldHideTrackedCards && isStruck,
  })
  const cardClassName = cx('result-card__title-row', {
    'result-card__title-row--struck': isStruck,
    'result-card__title-row--hidden': shouldHideTrackedCards && isStruck,
  })

  const indexToRarityIconMap = {
    [0]: <CircleIcon className={cx('result-card__rarity-icon--common')} />,
    [1]: <SingleStarIcon className={cx('result-card__rarity-icon--uncommon')} />,
    [2]: <DoubleStarsIcon className={cx('result-card__rarity-icon--rare')} />,
    [3]: <TripleStarsIcon className={cx('result-card__rarity-icon--legendary')} />,
    [4]: <SkullIcon className={cx('result-card__rarity-icon--monster')} />,
  }

  const descriptionClassName = cx('result-card__description', {
    'result-card__description--struck': isStruck,
    'result-card__description--hidden': shouldHideTrackedCards && isStruck,
  })
  const blightbaneLinkClassName = cx('result-card__blightbane-link')

  const blightbaneLink = `https://www.blightbane.io/card/${card.name.replaceAll(' ', '_')}`

  const renderSpecialIcons = () => {
    const hasNonCollectible = shouldIncludeNonCollectibleCards && isNonCollectible(card)
    const hasAnimalCompanion = shouldIncludeAnimalCompanionCards && isAnimalCompanionCard(card)

    if (hasNonCollectible && hasAnimalCompanion) {
      return (
        <span className={cx('result-card__non-collectible-and-animal-companion')}>
          <PawIcon />
          <CrossIcon />
        </span>
      )
    }

    if (hasAnimalCompanion) {
      return (
        <span className={cx('result-card__animal-companion')}>
          <PawIcon />
        </span>
      )
    }

    if (hasNonCollectible) {
      return (
        <span className={cx('result-card__non-collectible')}>
          <CrossIcon />
        </span>
      )
    }

    return null
  }

  // The strike toggle lives on the container so one handler covers the artwork column, the title
  // row and the description.
  return (
    <div className={cardContainerClassName} key={card.name} onClick={() => toggleCardStrike(card)}>
      {shouldShowCardArt && <CardArtwork card={card} />}
      {/* Sibling of the content column, not part of the title row, so the icons centre against
          the whole row's height the way the artwork does. */}
      <span className={cx('result-card__icons')}>
        {indexToRarityIconMap[card.rarity as keyof typeof indexToRarityIconMap]}
        {renderSpecialIcons()}
      </span>
      <div className={cx('result-card__content')}>
        <div className={cardClassName}>
          <span className={cx('result-card__name')}>{card.name}</span>
          {shouldShowKeywords && !showCardsWithoutKeywords && (
            <span className={cx('result-card__keywords')}>{matchingKeywordsText}</span>
          )}
          {shouldShowCardSet && (
            <span className={cx('result-card__card-set')}>
              {getCardSetNameFromIndex(card.expansion)}
              {/* Marks cards from the nil (0) expansion, which are shown as Core cards */}
              {card.expansion === 0 && <span className={cx('result-card__card-set__nil')}>°</span>}
            </span>
          )}
        </div>
        {shouldShowDescription && (
          <div
            className={descriptionClassName}
            dangerouslySetInnerHTML={{
              __html: parseCardDescription(card.description, cx('result-card__description__icon')),
            }}
          />
        )}
        {shouldShowBlightbaneLink && (
          <span
            className={cx('result-card__blightbane-link-wrapper')}
            onClick={(event) => event.stopPropagation()}
          >
            <GradientLink
              text="See full description on Blightbane"
              url={blightbaneLink}
              className={blightbaneLinkClassName}
            />
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(ResultCard)
