import InfoModal from '@/shared/components/Modals/InfoModal'
import RarityBorderedArtwork, { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { CharacterClass } from '@/shared/types/characterClass'
import { createCx } from '@/shared/utils/classnames'
import { splitCamelCaseWords } from '@/shared/utils/textHelper'

import ClassEnergy from '@/speedruns/components/ClassEnergy'
import { getCardSetName } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import { parseCardDescription } from '@/codex/utils/cardHelper'
import { getGuaranteedTreasureEvents, getTreasurePoolEvents } from '@/codex/utils/treasureHelper'
import Section from '@/codex/components/shared/Section'

import CardPill from './CardPill'
import TreasureEventList from './TreasureEventList'
import TreasureFlag from './TreasureFlag'
import styles from './index.module.scss'
import GradientLink from '@/shared/components/GradientLink'

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

const EXPLORERS_TRICK = "Explorer's Trick"
const BOOTY_AND_SHOVEL = ['Booty', 'Shovel']

const getAvailability = (treasure: TreasureCard): TreasureAvailability[] => {
  const sourceCards = treasure.fromCards.map(({ card }) => card)

  return [
    { label: 'Card rewards', value: treasure.inCardRewards },
    { label: 'Sold by Merchant', value: treasure.inMerchant },
    { label: 'Sold by Alchemist', value: treasure.inAlchemist },
    { label: 'Trade / Transmute', value: treasure.fromTranspose || treasure.fromTrade },
    { label: "Explorer's Trick (card)", value: sourceCards.includes(EXPLORERS_TRICK) },
    {
      label: 'Booty / Shovel (card)',
      value: BOOTY_AND_SHOVEL.some((card) => sourceCards.includes(card)),
    },
  ]
}

const UNINFORMATIVE_TYPES = ['Utility']

const getSubtitle = ({ type, category }: TreasureCard, rarityName?: string) =>
  [rarityName, UNINFORMATIVE_TYPES.includes(type) ? '' : type, splitCamelCaseWords(category)]
    .filter(Boolean)
    .join(' ')

interface TreasureModalProps {
  treasure: EnrichedTreasureCard
  onClose: () => void
}

function TreasureModal({ treasure, onClose }: TreasureModalProps): JSX.Element {
  const { treasureDetails, cardDetails } = treasure
  const rarity = RARITIES[cardDetails.rarity]
  const subtitle = getSubtitle(treasureDetails, rarity?.name)
  const cardName = treasureDetails.name
  const cardSetName = getCardSetName(cardDetails.expansion)

  const guaranteedEvents = getGuaranteedTreasureEvents(treasureDetails)
  const poolEvents = getTreasurePoolEvents(treasureDetails)

  const rarityClassName = cx('treasure-modal-border', {
    [`treasure-modal-border--${rarity?.slug}`]: Boolean(rarity),
  })

  const cardSetHint = (
    <>
      The <strong>{cardSetName}</strong> card set must be enabled.
    </>
  )

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
        only offer this card if you also have the <strong>Infinitum</strong> card set enabled.
      </>
    ),
    'Flying Carpet': (
      <>
        The <strong>Undisturbed Grave</strong> and <strong>Broken Tombstone</strong> events will
        only offer this card if you have either the <strong>Eclypse</strong> or{' '}
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
          title="Acquired outside of events"
          dividerColor={rarity ? RARITY_COLOR : undefined}
        >
          {cardSetName !== 'Core' && (
            <div className={cx('treasure-modal__hint')}>{cardSetHint}</div>
          )}
          <div className={cx('treasure-modal__availability')}>
            {getAvailability(treasureDetails).map(({ label, value }) => (
              <TreasureFlag key={label} label={label} value={value} />
            ))}
          </div>
        </Section>

        {guaranteedEvents.length > 0 && (
          <Section
            title={`Acquired from events (${guaranteedEvents.length})`}
            dividerColor={rarity ? RARITY_COLOR : undefined}
          >
            <div className={cx('treasure-modal__hint')}>
              Events that can always offer this treasure.
            </div>
            <TreasureEventList events={guaranteedEvents} />
          </Section>
        )}

        {poolEvents.length > 0 && (
          <Section
            title={`In treasure pool used by events (${poolEvents.length})`}
            dividerColor={rarity ? RARITY_COLOR : undefined}
          >
            <div className={cx('treasure-modal__hint')}>
              Events that draw from a treasure pool containing this card.
              {cardSetName !== 'Core' && <> {cardSetHint}</>}
            </div>
            <TreasureEventList events={poolEvents} />
          </Section>
        )}

        {cardSpecificNotes[cardName] && (
          <Section title="Additional notes" dividerColor={rarity ? RARITY_COLOR : undefined}>
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
