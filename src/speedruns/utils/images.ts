import { SpeedRunClass, SpeedRunSubclass } from '../types/speedRun'
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

export function getClassImageUrl(classType: SpeedRunClass) {
  switch (classType) {
    case SpeedRunClass.Arcanist:
      return ArcanistImageUrl
    case SpeedRunClass.Hunter:
      return HunterImageUrl
    case SpeedRunClass.Knight:
      return KnightImageUrl
    case SpeedRunClass.Rogue:
      return RogueImageUrl
    case SpeedRunClass.Seeker:
      return SeekerImageUrl
    case SpeedRunClass.Warrior:
      return WarriorImageUrl
    default:
      return SunforgeImageUrl
  }
}

export function getEnergyImageUrl(classType: SpeedRunClass | SpeedRunSubclass) {
  switch (classType) {
    case SpeedRunClass.Arcanist:
    case SpeedRunSubclass.Arcanist:
      return IntImageUrl
    case SpeedRunClass.Hunter:
    case SpeedRunSubclass.Hunter:
      return DexStrImageUrl
    case SpeedRunClass.Knight:
    case SpeedRunSubclass.Knight:
      return IntStrImageUrl
    case SpeedRunClass.Rogue:
    case SpeedRunSubclass.Rogue:
      return DexImageUrl
    case SpeedRunClass.Seeker:
    case SpeedRunSubclass.Seeker:
      return DexIntImageUrl
    case SpeedRunClass.Warrior:
    case SpeedRunSubclass.Warrior:
      return StrImageUrl
    case SpeedRunClass.Sunforge:
      return HolyImageUrl
    case SpeedRunSubclass.Hybrid:
      return NeutralImageUrl
    default:
      return NeutralImageUrl
  }
}
