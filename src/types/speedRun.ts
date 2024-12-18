export enum SpeedRunClass {
  Arcanist = 'Arcanist',
  Hunter = 'Hunter',
  Knight = 'Knight',
  Rogue = 'Rogue',
  Seeker = 'Seeker',
  Warrior = 'Warrior',
  Sunforge = 'Sunforge',
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
}

export type SpeedRunCategory = `${SpeedRunClass}-${Difficulty}`

export type SpeedRunApiResponse = {
  [key in SpeedRunCategory]: Array<{
    _id: string
    uid: number
    version: string
    stats: { clock1: string }
    discorduser: string | null
  }>
}
