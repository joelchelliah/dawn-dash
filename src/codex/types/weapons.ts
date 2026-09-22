import { CardData } from '@/codex/types/cards'
import { TreasureSource } from '@/codex/types/treasures'

export interface SpecialWeapon {
  id: number
  name: string
  rarity: string
  category: string
  type: string
  hasConjurationRoute: boolean
  fromEvents: TreasureSource[]
  fromCards: TreasureSource[]
  fromTalents: TreasureSource[]
}

export interface EnrichedSpecialWeapon {
  weaponDetails: SpecialWeapon
  cardDetails: CardData
}
