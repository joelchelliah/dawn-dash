import { CharacterClass } from '@/shared/types/characterClass'

import {
  IntImageUrl,
  DexStrImageUrl,
  IntStrImageUrl,
  DexImageUrl,
  DexIntImageUrl,
  StrImageUrl,
  HolyImageUrl,
  NeutralImageUrl,
} from './imageUrls'

export function getEnergyImageUrl(classType: CharacterClass) {
  switch (classType) {
    case CharacterClass.Arcanist:
      return IntImageUrl
    case CharacterClass.Hunter:
      return DexStrImageUrl
    case CharacterClass.Knight:
      return IntStrImageUrl
    case CharacterClass.Rogue:
      return DexImageUrl
    case CharacterClass.Seeker:
      return DexIntImageUrl
    case CharacterClass.Warrior:
      return StrImageUrl
    case CharacterClass.Sunforge:
      return HolyImageUrl
    default:
      return NeutralImageUrl
  }
}
