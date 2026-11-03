import { memo, useMemo } from 'react'

import ResultCard from '@/shared/components/ResultCard'
import { CardData } from '@/shared/types/cards'
import { isCardMatchingKeyword } from '@/shared/utils/keywordMatching'
import { isNonCollectible } from '@/shared/utils/cardHelper'

import { isAnimalCompanionCard } from '@/cardex/utils/cardHelper'

import { STRUCK_TRIGGER } from './struckTrigger'
import CardStrikeBadge from './CardStrikeBadge'

interface CardexResultCardProps {
  card: CardData
  parsedKeywords: string[]
  isStruck: boolean
  toggleCardStrike: (card: CardData) => void
  getCardSetNameFromIndex: (index: number) => string
  getCardTypeNameFromIndex: (index: number) => string
  getCardTypeEmojiFromIndex: (index: number) => string
  shouldIncludeNonCollectibleCards: boolean
  shouldIncludeAnimalCompanionCards: boolean
  shouldShowDescription: boolean
  shouldShowKeywords: boolean
  shouldShowCardSet: boolean
  shouldShowCardType: boolean
  shouldShowCardArt: boolean
  shouldShowBlightbaneLink: boolean
  showCardsWithoutKeywords: boolean
  entryIndex: number
}

// Adds Cardex's keyword pills, exact-match highlight and card tracking to the shared row.
const CardexResultCard = ({
  card,
  parsedKeywords,
  isStruck,
  toggleCardStrike,
  shouldIncludeNonCollectibleCards,
  shouldIncludeAnimalCompanionCards,
  shouldShowKeywords,
  showCardsWithoutKeywords,
  ...rowProps
}: CardexResultCardProps) => {
  const matchingKeywords = useMemo(
    () => parsedKeywords.filter((keyword) => isCardMatchingKeyword(card, keyword)),
    [parsedKeywords, card]
  )

  const isFullMatch = parsedKeywords.some(
    (keyword) => card.name.toLowerCase() === keyword.toLowerCase()
  )

  // Note: These two are not mutually exclusive. After clicking "show cards without keywords", you can still toggle the checkbox state regardless.
  // In this case, this should have no effect on the rest of the elements.
  const isShowingKeywords = shouldShowKeywords && !showCardsWithoutKeywords

  return (
    <ResultCard
      card={card}
      {...rowProps}
      keywords={isShowingKeywords ? matchingKeywords : undefined}
      isHighlighted={isFullMatch}
      hasNonCollectibleIcon={shouldIncludeNonCollectibleCards && isNonCollectible(card)}
      hasAnimalCompanionIcon={shouldIncludeAnimalCompanionCards && isAnimalCompanionCard(card)}
      className={isStruck ? STRUCK_TRIGGER : undefined}
      badge={isStruck && <CardStrikeBadge />}
      onClick={toggleCardStrike}
    />
  )
}

export default memo(CardexResultCard)
