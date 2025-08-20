import { CharacterClass } from '@/shared/types/characterClass'

export enum SpeedRunClass {
  Arcanist = CharacterClass.Arcanist,
  Hunter = CharacterClass.Hunter,
  Knight = CharacterClass.Knight,
  Rogue = CharacterClass.Rogue,
  Seeker = CharacterClass.Seeker,
  Warrior = CharacterClass.Warrior,
  Sunforge = CharacterClass.Sunforge,
}

export enum SpeedRunSubclass {
  All = 'All',
  Arcanist = 'Arcanist',
  Hunter = 'Hunter',
  Knight = 'Knight',
  Rogue = 'Rogue',
  Seeker = 'Seeker',
  Warrior = 'Warrior',
  Hybrid = 'Hybrid',
}

export enum Difficulty {
  Normal = 'Normal',
  Challenging = 'Challenging',
  Hard = 'Hard',
  Impossible = 'Impossible',
}

export interface GameVersion {
  major: number
  minor: number
  patch: number
}

export interface SpeedRunData {
  id: string
  uid: number
  duration: string
  discorduser: string | null
  version: GameVersion
  subclass: SpeedRunSubclass
}

export type SpeedRunCategory = `${SpeedRunClass}-${Difficulty}`

export type SpeedRunApiResponse = {
  [key in SpeedRunCategory]: Array<{
    _id: string
    uid: number
    subclass: string
    version: string
    stats: { clock1: string }
    discorduser: string | null
  }>
}
