import { CharacterClass } from '@/shared/types/characterClass'

import { SpeedRunSubclass } from '../types/speedRun'
import {
  ArcanistImageUrl,
  HunterImageUrl,
  KnightImageUrl,
  RogueImageUrl,
  SeekerImageUrl,
  WarriorImageUrl,
  SunforgeImageUrl,
  IntImageUrl,
  DexStrImageUrl,
  IntStrImageUrl,
  DexImageUrl,
  DexIntImageUrl,
  StrImageUrl,
  HolyImageUrl,
  NeutralImageUrl,
} from '../../shared/utils/imageUrls'

export function getClassImageUrl(classType: CharacterClass) {
  switch (classType) {
    case CharacterClass.Arcanist:
      return ArcanistImageUrl
    case CharacterClass.Hunter:
      return HunterImageUrl
    case CharacterClass.Knight:
      return KnightImageUrl
    case CharacterClass.Rogue:
      return RogueImageUrl
    case CharacterClass.Seeker:
      return SeekerImageUrl
    case CharacterClass.Warrior:
      return WarriorImageUrl
    default:
      return SunforgeImageUrl
  }
}

export function getEnergyImageUrl(classType: CharacterClass | SpeedRunSubclass) {
  switch (classType) {
    case CharacterClass.Arcanist:
    case SpeedRunSubclass.Arcanist:
      return IntImageUrl
    case CharacterClass.Hunter:
    case SpeedRunSubclass.Hunter:
      return DexStrImageUrl
    case CharacterClass.Knight:
    case SpeedRunSubclass.Knight:
      return IntStrImageUrl
    case CharacterClass.Rogue:
    case SpeedRunSubclass.Rogue:
      return DexImageUrl
    case CharacterClass.Seeker:
    case SpeedRunSubclass.Seeker:
      return DexIntImageUrl
    case CharacterClass.Warrior:
    case SpeedRunSubclass.Warrior:
      return StrImageUrl
    case CharacterClass.Sunforge:
      return HolyImageUrl
    case SpeedRunSubclass.Hybrid:
      return NeutralImageUrl
    default:
      return NeutralImageUrl
  }
}
