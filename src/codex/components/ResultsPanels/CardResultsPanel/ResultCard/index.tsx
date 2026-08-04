import { memo, useMemo } from 'react'

import GradientLink from '@/shared/components/GradientLink'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { createCx } from '@/shared/utils/classnames'

import { UseAllCardSearchFilters } from '@/codex/hooks/useSearchFilters'
import { CardData } from '@/codex/types/cards'
import { parseCardDescription } from '@/codex/utils/cardHelper'

import CardArtwork from './CardArtwork'
import CardIcons from './CardIcons'
import CardMetadata from './CardMetadata'
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
    useCardTypeFilters,
    useExtraCardFilters,
    useFormattingFilters,
    useCardStrike,
  } = useSearchFilters
  const { getCardSetNameFromIndex } = useCardSetFilters
  const { getCardTypeNameFromIndex, getCardTypeEmojiFromIndex } = useCardTypeFilters
  const { shouldIncludeNonCollectibleCards, shouldIncludeAnimalCompanionCards } =
    useExtraCardFilters
  const {
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
    shouldShowCardType,
    shouldShowCardArt,
    shouldShowBlightbaneLink,
    shouldHideTrackedCards,
  } = useFormattingFilters
  const { isCardStruck, toggleCardStrike } = useCardStrike
  const { isMobile } = useBreakpoint()

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

  // Note: These two are not mutually exclusive. After clicking "show cards without keywords", you can still toggle the checkbox state regardless.
  // In this case, this should have no effect on the rest of the elements.
  const isShowingKeywords = shouldShowKeywords && !showCardsWithoutKeywords

  // When description is disabled, there are 2 elements we can show under the name: keywords and Blightbane link.
  // We want to adjust the size of the name based on whether we're showing one or none of these elements.
  const isShowingOneAdditionalNonDescElement =
    (!isShowingKeywords && shouldShowBlightbaneLink) ||
    (isShowingKeywords && !shouldShowBlightbaneLink)
  const isShowingNoAdditionalNonDescElements = !isShowingKeywords && !shouldShowBlightbaneLink

  const nameClassName = cx('result-card__name', {
    'result-card__name--enlarged': !shouldShowDescription && isShowingOneAdditionalNonDescElement,
    'result-card__name--enlarged-more':
      !shouldShowDescription && isShowingNoAdditionalNonDescElements,
  })

  const shouldShowKeywordsOnSeparateRow = isShowingKeywords && (!shouldShowDescription || isMobile)
  const keywordsSeparateRowClassName = cx(
    'result-card__keywords',
    'result-card__keywords--own-row',
    {
      'result-card__keywords--struck': isStruck,
      'result-card__keywords--hidden': shouldHideTrackedCards && isStruck,
    }
  )

  const descriptionClassName = cx('result-card__description', {
    'result-card__description--struck': isStruck,
    'result-card__description--hidden': shouldHideTrackedCards && isStruck,
  })
  const blightbaneLinkClassName = cx('result-card__blightbane-link')

  const blightbaneLink = `https://www.blightbane.io/card/${card.name.replaceAll(' ', '_')}`

  // The strike toggle lives on the container so one handler covers the artwork column, the title
  // row and the description.
  return (
    <div className={cardContainerClassName} key={card.name} onClick={() => toggleCardStrike(card)}>
      {shouldShowCardArt && <CardArtwork card={card} />}
      {/* Sibling of the content column, not part of the title row, so the icons centre against
          the whole row's height the way the artwork does. */}
      <CardIcons
        card={card}
        shouldIncludeNonCollectibleCards={shouldIncludeNonCollectibleCards}
        shouldIncludeAnimalCompanionCards={shouldIncludeAnimalCompanionCards}
        shouldOverlapWithCardArt={shouldShowCardArt}
      />
      <div className={cx('result-card__content')}>
        <div className={cardClassName}>
          <span className={nameClassName}>{card.name}</span>
          {isShowingKeywords && !shouldShowKeywordsOnSeparateRow && (
            <span className={cx('result-card__keywords')}>{matchingKeywordsText}</span>
          )}
          <CardMetadata
            card={card}
            shouldShowCardSet={shouldShowCardSet}
            shouldShowCardType={shouldShowCardType}
            getCardSetNameFromIndex={getCardSetNameFromIndex}
            getCardTypeNameFromIndex={getCardTypeNameFromIndex}
            getCardTypeEmojiFromIndex={getCardTypeEmojiFromIndex}
          />
        </div>
        {shouldShowKeywordsOnSeparateRow && (
          <span className={keywordsSeparateRowClassName}>{matchingKeywordsText}</span>
        )}
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
