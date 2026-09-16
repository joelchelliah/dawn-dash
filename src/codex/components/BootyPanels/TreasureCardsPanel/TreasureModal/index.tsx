import { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { CharacterClass } from '@/shared/types/characterClass'
import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import ClassEnergy from '@/shared/components/ClassEnergy'

import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import { getRelatedEvents, getRelatedTreasurePoolCards } from '@/codex/utils/treasureHelper'

import CardModal, { getCardSubtitle } from '../../shared/CardModal'
import { TREASURE_ARTWORK } from '../../shared/cardArtwork'
import { Acquisition } from '../../shared/CardModal/AcquisitionFlag'
import styles from '../../shared/CardModal/index.module.scss'

const cx = createCx(styles)

const getAcquisitions = (treasure: TreasureCard): Acquisition[] => {
  const { fromCards, fromTalents, fromEvents } = treasure

  return [
    { label: 'Combat rewards', value: treasure.inCardRewards },
    { label: 'Merchant (Julius)', value: treasure.inMerchant },
    { label: 'Alchemist (Theresa)', value: treasure.inAlchemist },
    { label: 'Trade / Transmute', value: treasure.fromTranspose || treasure.fromTrade },
    { label: 'Events', value: fromEvents.length > 0 },
    { label: 'Cards / Talents', value: fromCards.length + fromTalents.length > 0 },
  ]
}

interface TreasureModalProps {
  treasure: EnrichedTreasureCard
  cardData: CardData[] | undefined
  onClose: () => void
}

function TreasureModal({ treasure, cardData, onClose }: TreasureModalProps): JSX.Element {
  const { treasureDetails, cardDetails } = treasure
  const rarity = RARITIES[cardDetails.rarity]
  const cardName = treasureDetails.name

  return (
    <CardModal
      cardName={cardName}
      subtitle={getCardSubtitle(treasureDetails, rarity?.name)}
      cardDetails={cardDetails}
      artwork={TREASURE_ARTWORK}
      cardNoun="treasure"
      acquisitions={getAcquisitions(treasureDetails)}
      relatedEvents={getRelatedEvents(treasureDetails)}
      relatedCards={getRelatedTreasurePoolCards(treasureDetails, cardData)}
      additionalNotes={ADDITIONAL_NOTES[cardName]}
      onClose={onClose}
    />
  )
}

const ADDITIONAL_NOTES: Record<string, JSX.Element> = {
  'Dark Mirror Vial': (
    <>
      Cannot be acquired via{' '}
      <GradientLink url="https://www.blightbane.io/card/Tradepost" text="Tradepost" />, but any
      other form of trade or transmute will work.
      <br />
      <br />
      The <strong>Undisturbed Grave</strong> and <strong>Broken Tombstone</strong> events will only
      have a chance to offer this card if you also have the <strong>Infinitum</strong> card set
      enabled.
    </>
  ),
  'Flying Carpet': (
    <>
      The <strong>Undisturbed Grave</strong> and <strong>Broken Tombstone</strong> events will only
      have a chance to offer this card if you have either the <strong>Eclypse</strong> or{' '}
      <strong>Infinitum</strong> card set enabled.
    </>
  ),
  'Rusty Lamp': (
    <>
      Only available if you have <EnergyPip classType={CharacterClass.Arcanist} /> or{' '}
      <EnergyPip classType={CharacterClass.Rogue} /> attributes.
    </>
  ),
  Tradepost: (
    <>
      The <strong>Undisturbed Grave</strong> and <strong>Broken Tombstone</strong> events explicitly
      exclude this card.
    </>
  ),
}

function EnergyPip({ classType }: { classType: CharacterClass }): JSX.Element {
  return (
    <span className={cx('card-modal__hint__energy')}>
      <ClassEnergy classType={classType} />
    </span>
  )
}

export default TreasureModal
