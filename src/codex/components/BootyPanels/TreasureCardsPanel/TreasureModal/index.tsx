import InfoModal from '@/shared/components/Modals/InfoModal'
import RarityBorderedArtwork, { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { CharacterClass } from '@/shared/types/characterClass'
import { createCx } from '@/shared/utils/classnames'
import { splitCamelCaseWords } from '@/shared/utils/textHelper'
import GradientLink from '@/shared/components/GradientLink'
import ClassEnergy from '@/shared/components/ClassEnergy'

import { getCardSetName } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import { parseCardDescription } from '@/codex/utils/cardHelper'
import {
  getRelatedEvents,
  getRelatedTreasurePoolCards,
  getRelatedTreasurePoolEvents,
} from '@/codex/utils/treasureHelper'
import Section from '@/codex/components/shared/Section'

import CardPill from './CardPill'
import RelatedCardList from './RelatedCardList'
import RelatedEventList from './RelatedEventList'
import TreasureFlag from './TreasureFlag'
import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 50
const ARTWORK_SIZE_MOBILE = 44
const ARTWORK_BORDER_OPACITY = 75
const MODAL_MAX_WIDTH = 700
const RARITY_COLOR = 'var(--rarity-color)'

interface TreasureAvailability {
  label: string
  value: boolean
}

const getAvailability = (treasure: TreasureCard): TreasureAvailability[] => {
  const { fromCards, fromTalents, fromEvents, fromTreasureEvents } = treasure

  return [
    { label: 'Combat rewards', value: treasure.inCardRewards },
    { label: 'Merchant (Julius)', value: treasure.inMerchant },
    { label: 'Alchemist (Theresa)', value: treasure.inAlchemist },
    { label: 'Trade / Transmute', value: treasure.fromTranspose || treasure.fromTrade },
    { label: 'Events', value: fromEvents.length + fromTreasureEvents.length > 0 },
    { label: 'Cards / Talents', value: fromCards.length + fromTalents.length > 0 },
  ]
}

const UNINFORMATIVE_TYPES = ['Utility']

const getSubtitle = ({ type, category }: TreasureCard, rarityName?: string) =>
  [rarityName, UNINFORMATIVE_TYPES.includes(type) ? '' : type, splitCamelCaseWords(category)]
    .filter(Boolean)
    .join(' ')

interface TreasureModalProps {
  treasure: EnrichedTreasureCard
  cardData: CardData[] | undefined
  onClose: () => void
}

function TreasureModal({ treasure, cardData, onClose }: TreasureModalProps): JSX.Element {
  const { treasureDetails, cardDetails } = treasure
  const rarity = RARITIES[cardDetails.rarity]
  const subtitle = getSubtitle(treasureDetails, rarity?.name)
  const cardName = treasureDetails.name
  const cardSetName = getCardSetName(cardDetails.expansion)

  const relatedEvents = getRelatedEvents(treasureDetails)
  const relatedPoolEvents = getRelatedTreasurePoolEvents(treasureDetails)
  const relatedPoolCards = getRelatedTreasurePoolCards(treasureDetails, cardData)

  const rarityClassName = cx('treasure-modal-border', {
    [`treasure-modal-border--${rarity?.slug}`]: Boolean(rarity),
  })

  const potionNotes = <>Can also be created during combat by several different cards.</>
  const cardSpecificNotes: Record<string, JSX.Element> = {
    'Dark Mirror Vial': (
      <>
        Cannot be acquired via{' '}
        <GradientLink url="https://www.blightbane.io/card/Tradepost" text="Tradepost" />, but any
        other form of trade or transmute will work.
        <br />
        <br />
        The <strong>Undisturbed Grave</strong> and <strong>Broken Tombstone</strong> events will
        only have a chance to offer this card if you also have the <strong>Infinitum</strong> card
        set enabled.
      </>
    ),
    'Flying Carpet': (
      <>
        The <strong>Undisturbed Grave</strong> and <strong>Broken Tombstone</strong> events will
        only have a chance to offer this card if you have either the <strong>Eclypse</strong> or{' '}
        <strong>Infinitum</strong> card set enabled.
      </>
    ),
    'Healing Potion': potionNotes,
    'Potion of Visions': potionNotes,
    'Rusty Lamp': (
      <>
        Only available if you have <EnergyPip classType={CharacterClass.Arcanist} /> or{' '}
        <EnergyPip classType={CharacterClass.Rogue} /> attributes.
      </>
    ),
    'Staff of Thunder': (
      <>
        Can also be acquired via{' '}
        <GradientLink url="https://www.blightbane.io/card/Elite_Weaponry" text="Elite Weaponry" />.
      </>
    ),
    Tradepost: (
      <>
        The <strong>Undisturbed Grave</strong> and <strong>Broken Tombstone</strong> events
        explicitly exclude this card.
      </>
    ),
  }

  return (
    <InfoModal
      isOpen
      onClose={onClose}
      maxWidth={MODAL_MAX_WIDTH}
      scrollable
      borderClassName={rarityClassName}
      buttonColor={rarity ? RARITY_COLOR : undefined}
    >
      <div className={cx('treasure-modal')}>
        <div className={cx('treasure-modal__card')}>
          <div className={cx('treasure-modal__header')}>
            <RarityBorderedArtwork
              cardName={cardName}
              rarity={cardDetails.rarity}
              category={cardDetails.category}
              size={ARTWORK_SIZE}
              sizeMobile={ARTWORK_SIZE_MOBILE}
              borderOpacity={ARTWORK_BORDER_OPACITY}
            />
            <div className={cx('treasure-modal__header-text')}>
              <span className={cx('treasure-modal__name')}>{cardName}</span>
              {subtitle && (
                <span
                  className={cx('treasure-modal__subtitle', {
                    [`treasure-modal__subtitle--${rarity?.slug}`]: Boolean(rarity),
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
              className={cx('treasure-modal__description')}
              dangerouslySetInnerHTML={{
                __html: parseCardDescription(
                  cardDetails.description,
                  cx('treasure-modal__description__icon')
                ),
              }}
            />
          )}
        </div>

        <Section
          title="Can be acquired from..."
          spacing="medium"
          dividerColor={rarity ? RARITY_COLOR : undefined}
        >
          {cardSetName !== 'Core' && (
            <div className={cx('treasure-modal__hint')}>
              The <strong>{cardSetName}</strong> card set must be enabled.
            </div>
          )}
          <div className={cx('treasure-modal__availability')}>
            {getAvailability(treasureDetails).map(({ label, value }) => (
              <TreasureFlag key={label} label={label} value={value} />
            ))}
          </div>
        </Section>

        {relatedEvents.length > 0 && (
          <Section
            title={`Events (${relatedEvents.length})`}
            dividerColor={rarity ? RARITY_COLOR : undefined}
            spacing="medium"
          >
            <div className={cx('treasure-modal__hint')}>
              Events that will always offer this treasure.
            </div>
            <RelatedEventList events={relatedEvents} />
          </Section>
        )}

        {relatedPoolEvents.length > 0 && (
          <Section
            title={`Treasure pool events (${relatedPoolEvents.length})`}
            dividerColor={rarity ? RARITY_COLOR : undefined}
            spacing="medium"
          >
            <div className={cx('treasure-modal__hint')}>
              Events that draw from a treasure pool containing this card.
            </div>
            <RelatedEventList events={relatedPoolEvents} />
          </Section>
        )}

        {relatedPoolCards.length > 0 && (
          <Section
            title={`Treasure pool cards and talents (${relatedPoolCards.length})`}
            dividerColor={rarity ? RARITY_COLOR : undefined}
            spacing="medium"
          >
            <div className={cx('treasure-modal__hint')}>
              Cards and talents that draw from a treasure pool containing this treasure.
            </div>
            <RelatedCardList relatedCards={relatedPoolCards} />
          </Section>
        )}

        {cardSpecificNotes[cardName] && (
          <Section
            title="Additional notes"
            dividerColor={rarity ? RARITY_COLOR : undefined}
            spacing="medium"
          >
            <div className={cx('treasure-modal__hint')}>{cardSpecificNotes[cardName]}</div>
          </Section>
        )}
      </div>
    </InfoModal>
  )
}

const EnergyPip = ({ classType }: { classType: CharacterClass }) => (
  <span className={cx('treasure-modal__hint__energy')}>
    <ClassEnergy classType={classType} />
  </span>
)

export default TreasureModal
