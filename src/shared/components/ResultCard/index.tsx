import { memo, ReactNode } from 'react'

import GradientLink from '@/shared/components/GradientLink'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { createCx } from '@/shared/utils/classnames'
import { HOVER_TRIGGER } from '@/shared/utils/hoverTrigger'
import { CardData } from '@/shared/types/cards'
import { parseCardDescription } from '@/shared/utils/cardDescription'
import { getBlightbaneCardUrl } from '@/shared/utils/cardHelper'
import KeywordPills from '@/shared/components/KeywordPills'

import CardArtwork from './CardArtwork'
import CardIcons from './CardIcons'
import CardMetadata from './CardMetadata'
import styles from './index.module.scss'

interface ResultCardProps {
  card: CardData
  entryIndex: number
  shouldShowDescription: boolean
  shouldShowCardArt: boolean
  shouldShowBlightbaneLink: boolean
  shouldShowCardSet?: boolean
  shouldShowCardType?: boolean
  getCardSetNameFromIndex?: (index: number) => string
  getCardTypeNameFromIndex?: (index: number) => string
  getCardTypeEmojiFromIndex?: (index: number) => string
  // Keywords to show as pills on the row. Omit to show none.
  keywords?: string[]
  isHighlighted?: boolean
  hasNonCollectibleIcon?: boolean
  hasAnimalCompanionIcon?: boolean
  // Extra classes on the row, e.g. a global marker like Cardex's `STRUCK_TRIGGER`.
  className?: string
  // Drawn over the leading edge of the content column (Cardex's tracked-card check).
  badge?: ReactNode
  onClick?: (card: CardData) => void
  // A lone row that isn't part of a list
  isStatic?: boolean
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

const MAX_ENLARGED_NAME_LENGTH_MOBILE = 18

const ResultCard = ({
  card,
  entryIndex,
  shouldShowDescription,
  shouldShowCardArt,
  shouldShowBlightbaneLink,
  shouldShowCardSet = false,
  shouldShowCardType = false,
  getCardSetNameFromIndex,
  getCardTypeNameFromIndex,
  getCardTypeEmojiFromIndex,
  keywords,
  isHighlighted = false,
  hasNonCollectibleIcon = false,
  hasAnimalCompanionIcon = false,
  className,
  badge,
  onClick,
  isStatic = false,
}: ResultCardProps) => {
  const { isMobile } = useBreakpoint()

  const cardContainerClassName = cx('result-card', !isStatic && HOVER_TRIGGER, className, {
    'result-card--static': isStatic,
    'result-card--clickable': !!onClick,
    'result-card--highlighted': isHighlighted,
  })
  const cardClassName = cx('result-card__title-row')

  const isShowingKeywords = keywords !== undefined

  // When description is disabled, there are 2 elements we can show under the name: keywords and Blightbane link.
  // We want to adjust the size of the name based on whether we're showing one or none of these elements.
  const isShowingOneAdditionalNonDescElement =
    (!isShowingKeywords && shouldShowBlightbaneLink) ||
    (isShowingKeywords && !shouldShowBlightbaneLink)
  const isShowingNoAdditionalNonDescElements = !isShowingKeywords && !shouldShowBlightbaneLink

  const shouldEnlargeName =
    isStatic || (!shouldShowDescription && isShowingOneAdditionalNonDescElement)
  const isCardNameShortEnoughToEnlarge = isMobile
    ? card.name.length < MAX_ENLARGED_NAME_LENGTH_MOBILE
    : true
  const nameClassName = cx('result-card__name', {
    'result-card__name--enlarged': shouldEnlargeName && isCardNameShortEnoughToEnlarge,
    'result-card__name--enlarged-more':
      !shouldShowDescription &&
      isShowingNoAdditionalNonDescElements &&
      isCardNameShortEnoughToEnlarge,
  })

  const shouldShowKeywordsOnSeparateRow = isShowingKeywords && (!shouldShowDescription || isMobile)
  const keywordsSeparateRowClassName = cx('result-card__keywords', 'result-card__keywords--own-row')

  const descriptionClassName = cx('result-card__description')
  const blightbaneLinkClassName = cx('result-card__blightbane-link')

  const blightbaneLink = getBlightbaneCardUrl(card)

  // Staggered entry. Consumers key the results container on their query (Cardex: the parsed
  // keywords), so a new query remounts every row and re-runs this — no JS needed to retrigger it.
  //
  // Two values because highlighted rows run a second animation (the shine): a single value would
  // apply to both and hold the shine back by the row's stagger. The `0s` is the shine's.
  const entryDelayMs = Math.min(entryIndex, ENTRY_STAGGER_MAX_ROWS) * ENTRY_STAGGER_MS
  const animationDelay = `${entryDelayMs}ms, 0s`

  // The click handler lives on the container so one handler covers the artwork column, the title
  // row and the description.
  return (
    <div
      className={cardContainerClassName}
      onClick={onClick ? () => onClick(card) : undefined}
      style={{ animationDelay }}
    >
      {shouldShowCardArt && <CardArtwork card={card} />}
      {/* Sibling of the content column, not part of the title row, so the icons centre against
          the whole row's height the way the artwork does. */}
      <CardIcons
        card={card}
        hasNonCollectible={hasNonCollectibleIcon}
        hasAnimalCompanion={hasAnimalCompanionIcon}
        shouldOverlapWithCardArt={shouldShowCardArt}
      />
      <div className={cx('result-card__content')}>
        {badge}
        <div className={cardClassName}>
          <span className={nameClassName}>{card.name}</span>
          {isShowingKeywords && !shouldShowKeywordsOnSeparateRow && (
            <span className={cx('result-card__keywords')}>
              <KeywordPills
                parsedKeywords={keywords}
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
              parsedKeywords={keywords}
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
