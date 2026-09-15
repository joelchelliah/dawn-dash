import { useMemo, useState } from 'react'

import { CardData } from '@/codex/types/cards'
import { EnrichedTreasureCard } from '@/codex/types/treasures'

import CardList, { CardListItem } from '../../shared/CardsList'
import TreasureModal from '../TreasureModal'

interface TreasureListProps {
  treasures: EnrichedTreasureCard[]
  cardData: CardData[] | undefined
}

function TreasureList({ treasures, cardData }: TreasureListProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedTreasure = treasures.find(
    ({ treasureDetails }) => treasureDetails.id === selectedId
  )

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

  return (
    <>
      <CardList items={items} onSelect={setSelectedId} />
      {selectedTreasure && (
        <TreasureModal
          treasure={selectedTreasure}
          cardData={cardData}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}

export default TreasureList
