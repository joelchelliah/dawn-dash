import { useMemo } from 'react'

import { useBootyCardUrlParam } from '@/codex/hooks/useBootyCardUrlParam'
import { CardData } from '@/codex/types/cards'
import { EnrichedSpecialWeapon } from '@/codex/types/weapons'
import { getBootyCardUrlParam } from '@/codex/utils/bootyCardUrl'

import CardList, { CardListItem } from '../../shared/CardsList'
import { WEAPON_ARTWORK } from '../../shared/cardArtwork'
import WeaponModal from '../WeaponModal'

interface WeaponListProps {
  weapons: EnrichedSpecialWeapon[]
  cardData: CardData[] | undefined
}

function WeaponList({ weapons, cardData }: WeaponListProps): JSX.Element {
  const { cardNameInUrl, selectCardAndUpdateUrl, clearCardInUrl } = useBootyCardUrlParam()

  const selectedWeapon = cardNameInUrl
    ? weapons.find(
        ({ weaponDetails }) => getBootyCardUrlParam(weaponDetails.name, 'weapon') === cardNameInUrl
      )
    : undefined

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

  const selectById = (id: number) => {
    const weapon = weapons.find(({ weaponDetails }) => weaponDetails.id === id)
    if (weapon) selectCardAndUpdateUrl(getBootyCardUrlParam(weapon.weaponDetails.name, 'weapon'))
  }

  return (
    <>
      <CardList items={items} artwork={WEAPON_ARTWORK} onSelect={selectById} />
      {selectedWeapon && (
        <WeaponModal
          weapon={selectedWeapon.weaponDetails}
          cardDetails={selectedWeapon.cardDetails}
          cardData={cardData}
          onClose={clearCardInUrl}
        />
      )}
    </>
  )
}

export default WeaponList
