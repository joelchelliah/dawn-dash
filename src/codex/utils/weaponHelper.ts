import { logger } from '@/shared/utils/logger'

import { CardData } from '@/codex/types/cards'
import { TreasureCard } from '@/codex/types/treasures'
import { EnrichedSpecialWeapon, SpecialWeapon, SpecialWeaponDetails } from '@/codex/types/weapons'
import specialWeapons from '@/codex/data/special-weapons.json'
import treasureCards from '@/codex/data/treasure-cards.json'

const SPECIAL_WEAPONS = specialWeapons as SpecialWeapon[]
const TREASURES_BY_ID = new Map(
  (treasureCards as TreasureCard[]).map((treasure) => [treasure.id, treasure])
)

/*
 * A weapon flagged `isTreasure` carries nothing but its id and name — the weapons sync leaves the
 * rest to `treasure-cards.json`, which already holds the full entry. So the details are looked up
 * there rather than duplicated into both datasets.
 */
const getWeaponDetails = (
  weapon: SpecialWeapon
): SpecialWeaponDetails | TreasureCard | undefined =>
  weapon.isTreasure ? TREASURES_BY_ID.get(weapon.id) : weapon

export const enrichSpecialWeapons = (cardData: CardData[] | undefined): EnrichedSpecialWeapon[] => {
  if (!cardData) return []

  const cardsById = new Map(cardData.map((card) => [card.blightbane_id, card]))

  return SPECIAL_WEAPONS.flatMap((weapon) => {
    const weaponDetails = getWeaponDetails(weapon)
    const cardDetails = cardsById.get(weapon.id)

    if (!weaponDetails) {
      logger.warn(`No treasure data found for special weapon: ${weapon.name}`)
      return []
    }

    if (!cardDetails) {
      logger.warn(`No card data found for special weapon: ${weapon.name}`)
      return []
    }

    return [{ weaponDetails, cardDetails }]
  })
}
