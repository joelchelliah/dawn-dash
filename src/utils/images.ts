import { SpeedRunClass, SpeedRunSubclass } from '../types/speedRun'

export function getClassImageUrl(classType: SpeedRunClass) {
  switch (classType) {
    case SpeedRunClass.Arcanist:
      return 'https://blightbane.io/images/classes/Arcanist_I_M.webp'
    case SpeedRunClass.Hunter:
      return 'https://blightbane.io/images/classes/Hunter_I_F.webp'
    case SpeedRunClass.Knight:
      return 'https://blightbane.io/images/classes/Knight_I_M.webp'
    case SpeedRunClass.Rogue:
      return 'https://blightbane.io/images/classes/Rogue_I_F.webp'
    case SpeedRunClass.Seeker:
      return 'https://blightbane.io/images/classes/Seeker_I_M.webp'
    case SpeedRunClass.Warrior:
      return 'https://blightbane.io/images/classes/Warrior_I_M.webp'
    default:
      return 'https://blightbane.io/images/icons/cardart_5_50.webp'
  }
}

export function getEnergyImageUrl(classType: SpeedRunClass | SpeedRunSubclass) {
  switch (classType) {
    case SpeedRunClass.Arcanist:
    case SpeedRunSubclass.Arcanist:
      return 'https://blightbane.io/images/int.webp'
    case SpeedRunClass.Hunter:
    case SpeedRunSubclass.Hunter:
      return 'https://blightbane.io/images/dexstr.webp'
    case SpeedRunClass.Knight:
    case SpeedRunSubclass.Knight:
      return 'https://blightbane.io/images/intstr.webp'
    case SpeedRunClass.Rogue:
    case SpeedRunSubclass.Rogue:
      return 'https://blightbane.io/images/dex.webp'
    case SpeedRunClass.Seeker:
    case SpeedRunSubclass.Seeker:
      return 'https://blightbane.io/images/dexint.webp'
    case SpeedRunClass.Warrior:
    case SpeedRunSubclass.Warrior:
      return 'https://blightbane.io/images/str.webp'
    case SpeedRunClass.Sunforge:
      return 'https://blightbane.io/images/holy.webp'
    case SpeedRunSubclass.Hybrid:
      return 'https://blightbane.io/images/neutral.webp'
    default:
      return 'https://blightbane.io/images/neutral.webp'
  }
}
