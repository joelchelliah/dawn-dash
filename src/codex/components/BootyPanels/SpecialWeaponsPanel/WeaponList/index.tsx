import { useMemo } from 'react'

import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { useBootyCardUrlParam } from '@/codex/hooks/useBootyCardUrlParam'
import { CardData } from '@/codex/types/cards'
import { EnrichedSpecialWeapon } from '@/codex/types/weapons'
import { BOOTY_CARD_URL_OWNER, findBootyCardByUrlParam } from '@/codex/utils/bootyCardUrl'

import CardList, { CardListItem } from '../../shared/CardsList'
import { WEAPON_ARTWORK } from '../../shared/cardArtwork'
import WeaponModal from '../WeaponModal'

interface WeaponListProps {
  weapons: EnrichedSpecialWeapon[]
  cardData: CardData[] | undefined
}

function WeaponList({ weapons, cardData }: WeaponListProps): JSX.Element {
  const { cardNameInUrl, selectCardAndUpdateUrl, clearCardInUrl } = useBootyCardUrlParam()

  const isOwnedByThisPanel =
    !!cardNameInUrl && findBootyCardByUrlParam(cardNameInUrl)?.kind !== BOOTY_CARD_URL_OWNER
  const selectedWeapon = isOwnedByThisPanel
    ? weapons.find(
        ({ weaponDetails }) => normalizeEventNameForUrl(weaponDetails.name) === cardNameInUrl
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
    if (weapon) selectCardAndUpdateUrl(weapon.weaponDetails.name)
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
