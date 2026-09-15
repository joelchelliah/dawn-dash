import { CardData } from '@/codex/types/cards'
import { TreasureCard, TreasureSource } from '@/codex/types/treasures'

export interface SpecialWeaponDetails {
  id: number
  name: string
  category: string
  type: string
  isTreasure: false
  fromEvents: TreasureSource[]
  fromCards: TreasureSource[]
  fromTalents: TreasureSource[]
}

export interface TreasureSpecialWeapon {
  id: number
  name: string
  isTreasure: true
}

export type SpecialWeapon = SpecialWeaponDetails | TreasureSpecialWeapon

export interface EnrichedSpecialWeapon {
  weaponDetails: SpecialWeaponDetails | TreasureCard
  cardDetails: CardData
}
