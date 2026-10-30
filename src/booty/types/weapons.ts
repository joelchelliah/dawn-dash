import { CardData } from '@/shared/types/cards'

import { TreasureSource } from '@/booty/types/treasures'

export interface SpecialWeapon {
  id: number
  name: string
  rarity: string
  color: string
  category: string
  type: string
  hasConjurationRoute: boolean
  hasTradepostRoute: boolean
  fromEvents: TreasureSource[]
  fromCards: TreasureSource[]
  fromTalents: TreasureSource[]
}

export interface EnrichedSpecialWeapon {
  weaponDetails: SpecialWeapon
  cardDetails: CardData
}
