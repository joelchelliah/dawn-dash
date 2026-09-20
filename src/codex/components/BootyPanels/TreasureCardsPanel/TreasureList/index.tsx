import { useMemo } from 'react'

import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { useBootyCardUrlParam } from '@/codex/hooks/useBootyCardUrlParam'
import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard } from '@/codex/types/treasures'

import CardList, { CardListItem } from '../../shared/CardsList'
import { TREASURE_ARTWORK } from '../../shared/cardArtwork'
import TreasureModal from '../TreasureModal'

interface TreasureListProps {
  treasures: EnrichedTreasureCard[]
  cardData: CardData[] | undefined
}

function TreasureList({ treasures, cardData }: TreasureListProps): JSX.Element {
  const { cardNameInUrl, selectCardAndUpdateUrl, clearCardInUrl } = useBootyCardUrlParam()

  const selectedTreasure = cardNameInUrl
    ? treasures.find(
        ({ treasureDetails }) => normalizeEventNameForUrl(treasureDetails.name) === cardNameInUrl
      )
    : undefined

  const items = useMemo<CardListItem[]>(
    () =>
      treasures.map(({ treasureDetails, cardDetails }) => ({
        id: treasureDetails.id,
        name: treasureDetails.name,
        rarity: cardDetails.rarity,
        category: cardDetails.category,
        categoryString: treasureDetails.category,
      })),
    [treasures]
  )

  const selectById = (id: number) => {
    const treasure = treasures.find(({ treasureDetails }) => treasureDetails.id === id)
    if (treasure) selectCardAndUpdateUrl(treasure.treasureDetails.name)
  }

  return (
    <>
      <CardList items={items} artwork={TREASURE_ARTWORK} onSelect={selectById} />
      {selectedTreasure && (
        <TreasureModal treasure={selectedTreasure} cardData={cardData} onClose={clearCardInUrl} />
      )}
    </>
  )
}

export default TreasureList
