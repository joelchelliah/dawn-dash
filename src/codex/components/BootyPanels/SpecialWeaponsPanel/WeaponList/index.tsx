import { useMemo, useState } from 'react'

import { CardData } from '@/codex/types/cards'
import { EnrichedSpecialWeapon } from '@/codex/types/weapons'

import CardList, { CardListItem } from '../../shared/CardsList'
import { WEAPON_ARTWORK } from '../../shared/cardArtwork'
import TreasureModal from '../../TreasureCardsPanel/TreasureModal'
import WeaponModal from '../WeaponModal'

interface WeaponListProps {
  weapons: EnrichedSpecialWeapon[]
  cardData: CardData[] | undefined
}

function WeaponList({ weapons, cardData }: WeaponListProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedWeapon = weapons.find(({ weaponDetails }) => weaponDetails.id === selectedId)

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
        <SelectedWeaponModal
          weapon={selectedWeapon}
          cardData={cardData}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}

interface SelectedWeaponModalProps {
  weapon: EnrichedSpecialWeapon
  cardData: CardData[] | undefined
  onClose: () => void
}

/*
 * A weapon flagged `isTreasure` carries a full `TreasureCard` as its details (see `weaponHelper`),
 * so it gets the treasure modal — it has real Merchant/Alchemist/Trade flags, which the weapon
 * modal hardcodes to false.
 */
function SelectedWeaponModal({ weapon, cardData, onClose }: SelectedWeaponModalProps): JSX.Element {
  const { weaponDetails, cardDetails } = weapon

  if ('inCardRewards' in weaponDetails) {
    return (
      <TreasureModal
        treasure={{ treasureDetails: weaponDetails, cardDetails }}
        cardData={cardData}
        onClose={onClose}
      />
    )
  }

  return (
    <WeaponModal
      weapon={weaponDetails}
      cardDetails={cardDetails}
      cardData={cardData}
      onClose={onClose}
    />
  )
}

export default WeaponList
