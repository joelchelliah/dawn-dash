import GradientLink from '@/shared/components/GradientLink'
import {
  CircleIcon,
  SingleStarIcon,
  DoubleStarsIcon,
  TripleStarsIcon,
  SkullIcon,
  CrossIcon,
} from '@/shared/utils/icons'
import { createCx } from '@/shared/utils/classnames'

import { UseCardSearchFilters } from '@/codex/hooks/useSearchFilters'
import { CardData } from '@/codex/types/cards'
import {
  isNonCollectible,
  containsNonCollectible,
  parseCardDescription,
} from '@/codex/utils/cardHelper'

import styles from './index.module.scss'

interface ResultCardProps {
  card: CardData
  useSearchFilters: UseCardSearchFilters
  showCardsWithoutKeywords: boolean
}

const cx = createCx(styles)

const ResultCard = ({ card, useSearchFilters, showCardsWithoutKeywords }: ResultCardProps) => {
  const {
    parsedKeywords,
    matchingCards,
    useCardSetFilters,
    useExtraFilters,
    useFormattingFilters,
    useCardStrike,
  } = useSearchFilters
  const { getCardSetNameFromIndex } = useCardSetFilters
  const { shouldIncludeNonCollectibleCards } = useExtraFilters
  const {
    shouldShowRarity,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
    shouldShowBlightbaneLink,
    shouldHideTrackedCards,
  } = useFormattingFilters
  const { isCardStruck, toggleCardStrike } = useCardStrike

  const findMatchingKeywords = (card: CardData) => {
    const matches = parsedKeywords.filter(
      (keyword) =>
        card.name.toLowerCase().includes(keyword.toLowerCase()) ||
        card.description.toLowerCase().includes(keyword.toLowerCase())
    )

    return `{ ${matches.join(', ')} }`
  }

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
      shouldShowRarity && !shouldIncludeNonCollectibleCards,
    'result-card__description--non-collectible_margin':
      !shouldShowRarity && shouldIncludeNonCollectibleCards,
    'result-card__description--rarity_and_non-collectible_margin':
      shouldShowRarity && shouldIncludeNonCollectibleCards,
    'result-card__description--struck': isStruck,
    'result-card__description--hidden': shouldHideTrackedCards && isStruck,
  })
  const blightbaneLinkClassName = cx('result-card__blightbane-link', {
    'result-card__blightbane-link--rarity_margin':
      shouldShowRarity && !shouldIncludeNonCollectibleCards,
    'result-card__blightbane-link--non-collectible_margin':
      !shouldShowRarity && shouldIncludeNonCollectibleCards,
    'result-card__blightbane-link--rarity_and_non-collectible_margin':
      shouldShowRarity && shouldIncludeNonCollectibleCards,
  })

  const blightbaneLink = `https://www.blightbane.io/card/${card.name.replaceAll(' ', '_')}`

  return (
    <div className={cardContainerClassName} key={card.name}>
      <div className={cardClassName} onClick={() => toggleCardStrike(card)}>
        {shouldShowRarity && (
          <span className={cx('result-card__rarity')}>
            {indexToRarityIconMap[card.rarity as keyof typeof indexToRarityIconMap]}
          </span>
        )}
        {shouldIncludeNonCollectibleCards && containsNonCollectible(matchingCards) && (
          <span className={cx('result-card__non-collectible')}>
            {isNonCollectible(card) && <CrossIcon />}
          </span>
        )}
        <span className={cx('result-card__name')}>{card.name}</span>
        {shouldShowKeywords && !showCardsWithoutKeywords && (
          <span className={cx('result-card__keywords')}>{findMatchingKeywords(card)}</span>
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

export default ResultCard
