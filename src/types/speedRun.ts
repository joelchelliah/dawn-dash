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

export enum GameVersion {
  Metamorphosis = 'Metamorphosis',
  Infinitum = 'Infinitum',
  Catalyst = 'Catalyst',
  Eclypse = 'Eclypse',
}

export interface SpeedRunData {
  id: string
  uid: number
  duration: string
  discorduser: string | null
}

export type SpeedRunCategory = `${SpeedRunClass}-${Difficulty}`

export type SpeedRunApiResponse = {
  [key in SpeedRunCategory]: Array<{
    _id: string
    uid: number
    stats: { clock1: string }
    discorduser: string | null
  }>
}
