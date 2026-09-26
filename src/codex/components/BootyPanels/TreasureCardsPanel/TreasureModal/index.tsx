import { useMemo } from 'react'

import { CharacterClass } from '@/shared/types/characterClass'

import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import {
  getRelatedEvents,
  getRelatedTreasurePoolCards,
  getRelatedTreasurePoolTalents,
} from '@/codex/utils/treasureHelper'

import CardModal, { getCardSubtitle } from '../../shared/CardModal'
import EnergyPip from '../../shared/EnergyPip'
import { TREASURE_ARTWORK } from '../../shared/cardArtwork'
import { Acquisition } from '../../shared/CardModal/AcquisitionFlag'
import { Hl } from '../../shared/CardModal/Hl'

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
  const cardName = treasureDetails.name

  const relatedEvents = useMemo(() => getRelatedEvents(treasureDetails), [treasureDetails])
  const relatedCards = useMemo(
    () => getRelatedTreasurePoolCards(treasureDetails, cardData),
    [treasureDetails, cardData]
  )
  const relatedTalents = useMemo(
    () => getRelatedTreasurePoolTalents(treasureDetails),
    [treasureDetails]
  )

  return (
    <CardModal
      cardName={cardName}
      subtitle={getCardSubtitle(treasureDetails, treasureDetails.rarity)}
      cardDetails={cardDetails}
      hasConjurationRoute={treasureDetails.hasConjurationRoute}
      hasTradepostRoute={treasureDetails.hasTradepostRoute}
      artwork={TREASURE_ARTWORK}
      cardNoun="treasure"
      acquisitions={getAcquisitions(treasureDetails)}
      relatedEvents={relatedEvents}
      relatedCards={relatedCards}
      relatedTalents={relatedTalents}
      additionalNotes={ADDITIONAL_NOTES[cardName]}
      onClose={onClose}
    />
  )
}

const ADDITIONAL_NOTES: Record<string, JSX.Element> = {
  'Dark Mirror Vial': (
    <>
      Not obtained via <Hl>Tradepost</Hl>, but any other form of trade or transmute will work.
    </>
  ),
  'Rusty Lamp': (
    <>
      Only available in <strong>card pools</strong> if you have{' '}
      <EnergyPip classType={CharacterClass.Arcanist} /> or{' '}
      <EnergyPip classType={CharacterClass.Rogue} /> attributes.
    </>
  ),
}

export default TreasureModal
