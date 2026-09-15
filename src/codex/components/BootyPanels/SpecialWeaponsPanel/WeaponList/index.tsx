import { useMemo } from 'react'

import { EnrichedSpecialWeapon } from '@/codex/types/weapons'

import CardList, { CardListArtwork, CardListItem } from '../../shared/CardsList'

const WEAPON_ARTWORK: CardListArtwork = {
  height: 56,
  width: 33,
  heightMobile: 60,
  widthMobile: 35,
}

interface WeaponListProps {
  weapons: EnrichedSpecialWeapon[]
}

function WeaponList({ weapons }: WeaponListProps): JSX.Element {
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

  return <CardList items={items} artwork={WEAPON_ARTWORK} />
}

export default WeaponList
