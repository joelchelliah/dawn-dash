import { logger } from '@/shared/utils/logger'

import { CardData } from '@/codex/types/cards'
import { EnrichedSpecialWeapon, SpecialWeapon } from '@/codex/types/weapons'
import specialWeapons from '@/codex/data/special-weapons.json'

const SPECIAL_WEAPONS = specialWeapons as SpecialWeapon[]

export const enrichSpecialWeapons = (cardData: CardData[] | undefined): EnrichedSpecialWeapon[] => {
  if (!cardData) return []

  const cardsById = new Map(cardData.map((card) => [card.blightbane_id, card]))

  return SPECIAL_WEAPONS.flatMap((weapon) => {
    const cardDetails = cardsById.get(weapon.id)

    if (!cardDetails) {
      logger.warn(`No card data found for special weapon: ${weapon.name}`)
      return []
    }

    return [{ weaponDetails: weapon, cardDetails }]
  })
}
