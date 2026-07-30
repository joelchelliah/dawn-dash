import { CharacterClass } from '@/shared/types/characterClass'
import { getEnergyImageUrl as getClassEnergyImageUrl } from '@/shared/utils/energyImages'

import { SpeedRunSubclass } from '../types/speedRun'
import {
  ArcanistImageUrl,
  HunterImageUrl,
  KnightImageUrl,
  RogueImageUrl,
  SeekerImageUrl,
  WarriorImageUrl,
  SunforgeImageUrl,
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

/**
 * Speedruns-specific wrapper around the shared energy image lookup.
 *
 * Handles the subclasses that only exist here (All, Hybrid) and delegates
 * everything else to the shared function. The two enums share identical string
 * values for the six overlapping classes, so the cast is safe.
 */
export function getEnergyImageUrl(classType: CharacterClass | SpeedRunSubclass) {
  switch (classType) {
    case SpeedRunSubclass.All:
    case SpeedRunSubclass.Hybrid:
      return NeutralImageUrl
    default:
      return getClassEnergyImageUrl(classType as CharacterClass)
  }
}
