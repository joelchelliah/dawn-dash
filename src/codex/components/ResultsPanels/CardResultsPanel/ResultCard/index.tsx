import { memo, useMemo } from 'react'

import GradientLink from '@/shared/components/GradientLink'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { createCx } from '@/shared/utils/classnames'

import { UseAllCardSearchFilters } from '@/codex/hooks/useSearchFilters'
import { CardData } from '@/codex/types/cards'
import { parseCardDescription } from '@/codex/utils/cardHelper'
import KeywordPills from '@/codex/components/SearchPanels/shared/KeywordPills'

import CardArtwork from './CardArtwork'
import CardIcons from './CardIcons'
import CardMetadata from './CardMetadata'
import styles from './index.module.scss'

interface ResultCardProps {
  card: CardData
  useSearchFilters: UseAllCardSearchFilters
  showCardsWithoutKeywords: boolean
  entryIndex: number
}

const cx = createCx(styles)

// How much later each row starts its entry animation, and the row after which they all start at
// once. Without a ceiling the 400th row of a large result set would wait 400 steps to appear.
//
// The stagger has to be a decent fraction of the row's own duration or
// neighbouring rows animate almost in unison and the cascade is invisible.
const ENTRY_STAGGER_MS = 60
const ENTRY_STAGGER_MAX_ROWS = 12

// Roughly how much room the keyword pills may take, in characters — see `maxPillCharacters`.
const MAX_KEYWORD_CHARACTERS_INLINE = 75
const MAX_KEYWORD_CHARACTERS_OWN_ROW = 95
const MAX_KEYWORD_CHARACTERS_OWN_MOBILE = 35

const ResultCard = ({
  card,
  useSearchFilters,
  showCardsWithoutKeywords,
  entryIndex,
}: ResultCardProps) => {
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

  const matchingKeywords = useMemo(
    () =>
      parsedKeywords.filter(
        (keyword) =>
          card.name.toLowerCase().includes(keyword.toLowerCase()) ||
          card.description.toLowerCase().includes(keyword.toLowerCase())
      ),
    [parsedKeywords, card.name, card.description]
  )

  const isFullMatch = parsedKeywords.some(
    (keyword) => card.name.toLowerCase() === keyword.toLowerCase()
  )
  const isStruck = isCardStruck(card)

  // `result-card-hoverable` is deliberately unhashed (see the `:global` rules in CardArtwork /
  // CardIcons): those live in their own CSS modules and cannot see this module's hashed class names,
  // so the hover-driven hop needs one shared, stable hook to key off.
  const cardContainerClassName = `${cx('result-card', {
    'result-card--struck': isStruck,
    'result-card--full-match': isFullMatch,
    'result-card--hidden': shouldHideTrackedCards && isStruck,
  })} result-card-hoverable`
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

  // Staggered entry after a new search. The results container is keyed on the parsed keywords, so a
  // new search remounts every row and re-runs this — no JS needed to retrigger it.
  //
  // Two values because full-match rows run a second animation (the shine): a single value would
  // apply to both and hold the shine back by the row's stagger. The `0s` is the shine's.
  const entryDelayMs = Math.min(entryIndex, ENTRY_STAGGER_MAX_ROWS) * ENTRY_STAGGER_MS
  const animationDelay = `${entryDelayMs}ms, 0s`

  // The strike toggle lives on the container so one handler covers the artwork column, the title
  // row and the description.
  return (
    <div
      className={cardContainerClassName}
      key={card.name}
      onClick={() => toggleCardStrike(card)}
      style={{ animationDelay }}
    >
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
            <span className={cx('result-card__keywords')}>
              <KeywordPills
                parsedKeywords={matchingKeywords}
                matches={[]}
                singleLine
                maxPillCharacters={MAX_KEYWORD_CHARACTERS_INLINE}
              />
            </span>
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
          <span className={keywordsSeparateRowClassName}>
            <KeywordPills
              parsedKeywords={matchingKeywords}
              matches={[]}
              singleLine
              maxPillCharacters={
                isMobile ? MAX_KEYWORD_CHARACTERS_OWN_MOBILE : MAX_KEYWORD_CHARACTERS_OWN_ROW
              }
            />
          </span>
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
