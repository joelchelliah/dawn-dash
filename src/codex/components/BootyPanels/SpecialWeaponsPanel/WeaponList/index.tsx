import { useMemo, useState } from 'react'

import { CardData } from '@/codex/types/cards'
import { EnrichedSpecialWeapon } from '@/codex/types/weapons'

import CardList, { CardListItem } from '../../shared/CardsList'
import { WEAPON_ARTWORK } from '../../shared/cardArtwork'
import WeaponModal from '../WeaponModal'

interface WeaponListProps {
  weapons: EnrichedSpecialWeapon[]
  cardData: CardData[] | undefined
}

function WeaponList({ weapons, cardData }: WeaponListProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedWeapon =
    selectedId !== null && weapons.find(({ weaponDetails }) => weaponDetails.id === selectedId)

  const items = useMemo<CardListItem[]>(
    () =>
      weapons.map(({ weaponDetails, cardDetails }) => ({
        id: weaponDetails.id,
        name: weaponDetails.name,
        rarity: cardDetails.rarity,
        category: cardDetails.category,
        categoryString: weaponDetails.category,
      })),
    [weapons]
  )

  return (
    <>
      <CardList items={items} artwork={WEAPON_ARTWORK} onSelect={setSelectedId} />
      {selectedWeapon && (
        <WeaponModal
          weapon={selectedWeapon.weaponDetails}
          cardDetails={selectedWeapon.cardDetails}
          cardData={cardData}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}

export default WeaponList
