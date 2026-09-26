import InfoModal from '@/shared/components/Modals/InfoModal'
import RarityBorderedArtwork, { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'
import { splitCamelCaseWords } from '@/shared/utils/textHelper'

import { getCardSetName } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { CardData } from '@/codex/types/cards'
import { RelatedCards, RelatedEvents } from '@/codex/utils/treasureHelper'
import { parseCardDescription } from '@/codex/utils/cardHelper'
import Section from '@/codex/components/shared/Section'

import { CardListArtwork } from '../CardsList'

import AcquisitionFlag, { Acquisition } from './AcquisitionFlag'
import CardPill from './CardPill'
import RelatedCardList from './RelatedCardList'
import RelatedEventList from './RelatedEventList'
import styles from './index.module.scss'
import { Hl } from './Hl'

const cx = createCx(styles)

const ARTWORK_BORDER_OPACITY = 75
const MODAL_MAX_WIDTH = 700
const RARITY_COLOR = 'var(--rarity-color)'

// Types that say nothing a player would act on, so they are left out of the subtitle entirely.
const UNINFORMATIVE_TYPES = ['Utility']

const CATEGORY_ARTIFACT = 2

export const getCardSubtitle = (
  { type, category }: { type: string; category: string },
  rarityName?: string
): string =>
  [rarityName, UNINFORMATIVE_TYPES.includes(type) ? '' : type, splitCamelCaseWords(category)]
    .filter(Boolean)
    .join(' ')

/*
 * The shape every Booty card modal renders. Treasures and special weapons differ only in which
 * acquisition flags they carry and what extra copy sits between the sections, so each of them
 * derives this rather than the modal knowing either domain type.
 */
export interface CardModalProps {
  cardName: string
  subtitle: string
  cardDetails: CardData
  hasConjurationRoute: boolean
  hasTradepostRoute: boolean
  // The same dimensions the card's list rows use, so the two never drift
  artwork: CardListArtwork
  acquisitions: Acquisition[]
  // Desktop columns for the acquisition flags; mobile always falls back to two
  acquisitionColumns?: 3 | 4
  relatedEvents: RelatedEvents
  relatedCards: RelatedCards
  relatedTalents: RelatedCards
  // What the Events / Cards hints call this card, e.g. "treasure" or "weapon"
  cardNoun: string
  // Rendered directly below the acquisition flags — the weapons' "Special condition" section
  sectionAfterAcquisitions?: React.ReactNode
  additionalNotes?: React.ReactNode
  onClose: () => void
}

function CardModal({
  cardName,
  subtitle,
  cardDetails,
  hasConjurationRoute,
  hasTradepostRoute,
  artwork,
  acquisitions,
  acquisitionColumns = 3,
  relatedEvents,
  relatedCards,
  relatedTalents,
  cardNoun,
  sectionAfterAcquisitions,
  additionalNotes,
  onClose,
}: CardModalProps): JSX.Element {
  const rarity = RARITIES[cardDetails.rarity]
  const cardSetName = getCardSetName(cardDetails.expansion)
  const dividerColor = rarity ? RARITY_COLOR : undefined

  const { guaranteed: guaranteedEvents, fromPools: pooledEvents, total: eventCount } = relatedEvents
  const { guaranteed: guaranteedCards, fromPools: pooledCards, total: cardCount } = relatedCards
  const {
    guaranteed: guaranteedTalents,
    fromPools: pooledTalents,
    total: talentCount,
  } = relatedTalents

  const rarityClassName = cx('card-modal-border', {
    [`card-modal-border--${rarity?.slug}`]: Boolean(rarity),
  })

  const showCardSetRequirement =
    cardSetName !== 'Core' && (pooledEvents.length > 0 || pooledCards.length > 0)
  const showExplorerTrickArtifactNote = cardDetails.category === CATEGORY_ARTIFACT
  const showConjurableNote = hasConjurationRoute
  const showTradepostNote = hasTradepostRoute
  const showAdditionalNotesSection =
    showCardSetRequirement || showExplorerTrickArtifactNote || showConjurableNote || additionalNotes

  return (
    <InfoModal
      isOpen
      onClose={onClose}
      maxWidth={MODAL_MAX_WIDTH}
      scrollable
      borderClassName={rarityClassName}
      buttonColor={dividerColor}
    >
      <div className={cx('card-modal')}>
        <div className={cx('card-modal__card')}>
          <div className={cx('card-modal__header')}>
            <RarityBorderedArtwork
              cardName={cardName}
              rarity={cardDetails.rarity}
              category={cardDetails.category}
              size={artwork.height}
              sizeMobile={artwork.heightMobile}
              width={artwork.width}
              widthMobile={artwork.widthMobile}
              borderOpacity={ARTWORK_BORDER_OPACITY}
            />
            <div className={cx('card-modal__header-text')}>
              <span className={cx('card-modal__name')}>{cardName}</span>
              {subtitle && (
                <span
                  className={cx('card-modal__subtitle', {
                    [`card-modal__subtitle--${rarity?.slug}`]: Boolean(rarity),
                  })}
                >
                  {subtitle}
                </span>
              )}
            </div>
            <CardPill cardSet={cardSetName} />
          </div>

          {cardDetails.description && (
            <div
              className={cx('card-modal__description')}
              dangerouslySetInnerHTML={{
                __html: parseCardDescription(
                  cardDetails.description,
                  cx('card-modal__description__icon')
                ),
              }}
            />
          )}
        </div>

        <Section title="Can be acquired from..." spacing="medium" dividerColor={dividerColor}>
          <div
            className={cx('card-modal__availability', {
              'card-modal__availability--four-columns': acquisitionColumns === 4,
            })}
          >
            {acquisitions.map(({ label, value }) => (
              <AcquisitionFlag key={label} label={label} value={value} />
            ))}
          </div>
        </Section>

        {sectionAfterAcquisitions}

        {eventCount > 0 && (
          <Section title={`Events (${eventCount})`} dividerColor={dividerColor} spacing="medium">
            {guaranteedEvents.length > 0 && (
              <>
                <div className={cx('card-modal__hint')}>
                  Events that <span className={cx('card-modal__hint__highlighted')}>always</span>{' '}
                  offer this {cardNoun}, if you meet their conditions.
                </div>
                <RelatedEventList events={guaranteedEvents} />
              </>
            )}

            {pooledEvents.length > 0 && (
              <>
                <div
                  className={cx('card-modal__hint', {
                    'card-modal__hint--stacked': guaranteedEvents.length > 0,
                  })}
                >
                  Events that draw from a{' '}
                  <span className={cx('card-modal__hint__highlighted')}>pool</span> of cards,
                  containing this {cardNoun}.
                </div>
                <RelatedEventList events={pooledEvents} showPools />
              </>
            )}
          </Section>
        )}

        {cardCount > 0 && (
          <Section title={`Cards (${cardCount})`} dividerColor={dividerColor} spacing="medium">
            {guaranteedCards.length > 0 && (
              <>
                <div className={cx('card-modal__hint')}>
                  Cards that <span className={cx('card-modal__hint__highlighted')}>always</span>{' '}
                  offer this {cardNoun}.
                </div>
                <RelatedCardList relatedCards={guaranteedCards} />
              </>
            )}

            {pooledCards.length > 0 && (
              <>
                <div
                  className={cx('card-modal__hint', {
                    'card-modal__hint--stacked': guaranteedCards.length > 0,
                  })}
                >
                  Cards that draw from a{' '}
                  <span className={cx('card-modal__hint__highlighted')}>pool</span> of cards,
                  containing this {cardNoun}.
                </div>
                <RelatedCardList relatedCards={pooledCards} showPools />
              </>
            )}
          </Section>
        )}

        {talentCount > 0 && (
          <Section title={`Talents (${talentCount})`} dividerColor={dividerColor} spacing="medium">
            {guaranteedTalents.length > 0 && (
              <>
                <div className={cx('card-modal__hint')}>
                  Talents that <span className={cx('card-modal__hint__highlighted')}>always</span>{' '}
                  offer this {cardNoun}.
                </div>
                <RelatedCardList relatedCards={guaranteedTalents} />
              </>
            )}

            {pooledTalents.length > 0 && (
              <>
                <div
                  className={cx('card-modal__hint', {
                    'card-modal__hint--stacked': guaranteedTalents.length > 0,
                  })}
                >
                  Talents that draw from a{' '}
                  <span className={cx('card-modal__hint__highlighted')}>pool</span> of cards,
                  containing this {cardNoun}.
                </div>
                <RelatedCardList relatedCards={pooledTalents} showPools />
              </>
            )}
          </Section>
        )}

        {showAdditionalNotesSection && (
          <Section title="Additional notes" dividerColor={dividerColor} spacing="medium">
            {showCardSetRequirement && (
              <div className={cx('card-modal__hint')}>
                The <span className={cx('card-modal__hint__highlighted')}>{cardSetName}</span> card
                set must be enabled for this to be available in <strong>card pools</strong>.
              </div>
            )}
            {showExplorerTrickArtifactNote && (
              <div
                className={cx('card-modal__hint', {
                  'card-modal__hint--stacked': showCardSetRequirement,
                })}
              >
                Temporarily obtainable during combat, via <Hl>Explorer&apos;s Trick</Hl>
                &apos;s primary effect (Artifact pool), as an <strong>Untempered</strong> copy.
              </div>
            )}
            {showConjurableNote && (
              <div
                className={cx('card-modal__hint', {
                  'card-modal__hint--stacked':
                    showCardSetRequirement || showExplorerTrickArtifactNote,
                })}
              >
                Temporarily obtainable during combat, via certain <Hl>cards</Hl> or <Hl>talents</Hl>
                , as a <strong>Conjured</strong> copy.
              </div>
            )}
            {showTradepostNote && (
              <div
                className={cx('card-modal__hint', {
                  'card-modal__hint--stacked':
                    showCardSetRequirement || showExplorerTrickArtifactNote || showConjurableNote,
                })}
              >
                Obtainable via <Hl>Tradepost</Hl>, by trading in any card of the same{' '}
                <strong>color</strong> and <strong>rarity</strong>.
              </div>
            )}
            {additionalNotes && (
              <div
                className={cx('card-modal__hint', {
                  'card-modal__hint--stacked':
                    showCardSetRequirement ||
                    showExplorerTrickArtifactNote ||
                    showConjurableNote ||
                    showTradepostNote,
                })}
              >
                {additionalNotes}
              </div>
            )}
          </Section>
        )}
      </div>
    </InfoModal>
  )
}

export default CardModal
