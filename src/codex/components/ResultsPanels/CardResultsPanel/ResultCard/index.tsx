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
} from '@/shared/utils/icons'
import { createCx } from '@/shared/utils/classnames'

import { UseAllCardSearchFilters } from '@/codex/hooks/useSearchFilters'
import { CardData } from '@/codex/types/cards'
import {
  isNonCollectible,
  parseCardDescription,
  isAnimalCompanionCard,
} from '@/codex/utils/cardHelper'

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
    shouldShowRarity,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
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

  const cardContainerClassName = cx('result-card-container', {
    'result-card-container--struck': isStruck,
    'result-card-container--full-match': isFullMatch,
    'result-card-container--hidden': shouldHideTrackedCards && isStruck,
  })
  const cardClassName = cx('result-card', {
    'result-card--struck': isStruck,
    'result-card--hidden': shouldHideTrackedCards && isStruck,
  })

  const indexToRarityIconMap = {
    [0]: <CircleIcon className={cx('result-card__rarity__icon--common')} />,
    [1]: <SingleStarIcon className={cx('result-card__rarity__icon--uncommon')} />,
    [2]: <DoubleStarsIcon className={cx('result-card__rarity__icon--rare')} />,
    [3]: <TripleStarsIcon className={cx('result-card__rarity__icon--legendary')} />,
    [4]: <SkullIcon className={cx('result-card__rarity__icon--monster')} />,
  }

  const descriptionClassName = cx('result-card__description', {
    'result-card__description--rarity_margin':
      shouldShowRarity && !(isNonCollectible(card) || isAnimalCompanionCard(card)),
    'result-card__description--special-icons_margin':
      !shouldShowRarity && (isNonCollectible(card) || isAnimalCompanionCard(card)),
    'result-card__description--rarity_and_special_icons_margin':
      shouldShowRarity && (isNonCollectible(card) || isAnimalCompanionCard(card)),
    'result-card__description--struck': isStruck,
    'result-card__description--hidden': shouldHideTrackedCards && isStruck,
  })
  const blightbaneLinkClassName = cx('result-card__blightbane-link', {
    'result-card__blightbane-link--rarity_margin':
      shouldShowRarity && !(isNonCollectible(card) || isAnimalCompanionCard(card)),
    'result-card__blightbane-link--special-icons_margin':
      !shouldShowRarity && (isNonCollectible(card) || isAnimalCompanionCard(card)),
    'result-card__blightbane-link--rarity_and_special_icons_margin':
      shouldShowRarity && (isNonCollectible(card) || isAnimalCompanionCard(card)),
  })

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

  return (
    <div className={cardContainerClassName} key={card.name}>
      <div className={cardClassName} onClick={() => toggleCardStrike(card)}>
        {shouldShowRarity && (
          <span className={cx('result-card__rarity')}>
            {indexToRarityIconMap[card.rarity as keyof typeof indexToRarityIconMap]}
          </span>
        )}
        {renderSpecialIcons()}
        <span className={cx('result-card__name')}>{card.name}</span>
        {shouldShowKeywords && !showCardsWithoutKeywords && (
          <span className={cx('result-card__keywords')}>{matchingKeywordsText}</span>
        )}
        {shouldShowCardSet && (
          <span className={cx('result-card__card-set')}>
            {getCardSetNameFromIndex(card.expansion) ?? '-'}
          </span>
        )}
      </div>
      {shouldShowDescription && (
        <div
          className={descriptionClassName}
          onClick={() => toggleCardStrike(card)}
          dangerouslySetInnerHTML={{
            __html: parseCardDescription(card.description, cx('result-card__description__icon')),
          }}
        />
      )}
      {shouldShowBlightbaneLink && (
        <GradientLink
          text="See full description on Blightbane"
          url={blightbaneLink}
          className={blightbaneLinkClassName}
        />
      )}
    </div>
  )
}

export default memo(ResultCard)
