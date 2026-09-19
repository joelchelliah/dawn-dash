import { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { CharacterClass } from '@/shared/types/characterClass'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import { getRelatedEvents, getRelatedTreasurePoolCards } from '@/codex/utils/treasureHelper'

import CardModal, { getCardSubtitle } from '../../shared/CardModal'
import EnergyPip from '../../shared/EnergyPip'
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

const ADD_CARD_BY_KEYWORD_EXCEPTIONS = (
  <ul>
    <li>Undisturbed Grave</li>
    <li>Broken Tombstone</li>
    <li>Painted Landscape</li>
  </ul>
)

const ADDITIONAL_NOTES: Record<string, JSX.Element> = {
  'Dark Mirror Vial': (
    <>
      Cannot be traded into via{' '}
      <span className={cx('card-modal__hint__highlighted')}>Tradepost</span>, but any other form of
      trade or transmute will work.
      <br />
      <br />
      Events that only include this treasure in their <strong>card pool</strong> while{' '}
      <span className={cx('card-modal__hint__highlighted')}>Eclypse</span> is enabled:
      {ADD_CARD_BY_KEYWORD_EXCEPTIONS}
    </>
  ),
  'Flying Carpet': (
    <>
      Events that only include this treasure in their <strong>card pool</strong> while either{' '}
      <span className={cx('card-modal__hint__highlighted')}>Infinitum</span> or{' '}
      <span className={cx('card-modal__hint__highlighted')}>Eclypse</span> is enabled:
      {ADD_CARD_BY_KEYWORD_EXCEPTIONS}
    </>
  ),
  'Rusty Lamp': (
    <>
      Only available in <strong>card pools</strong> if you have{' '}
      <EnergyPip classType={CharacterClass.Arcanist} /> or{' '}
      <EnergyPip classType={CharacterClass.Rogue} /> attributes.
    </>
  ),
  Tradepost: (
    <>
      Events that exclude this treasure from their <strong>card pool</strong> while{' '}
      <span className={cx('card-modal__hint__highlighted')}>Infinitum</span> is enabled:
      {ADD_CARD_BY_KEYWORD_EXCEPTIONS}
    </>
  ),
}

export default TreasureModal
