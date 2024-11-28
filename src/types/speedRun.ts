export enum SpeedRunClass {
  Arcanist = 'Arcanist',
  Hunter = 'Hunter',
  Knight = 'Knight',
  Rogue = 'Rogue',
  Seeker = 'Seeker',
  Warrior = 'Warrior',
  Scion = 'Scion',
}

export interface SpeedRunData {
  _id: string
  uid: number
  duration: string
  discorduser: string | null
}

export type SpeedRunCategory = `${SpeedRunClass}-Impossible`

export type SpeedRunApiResponse = {
  [key in SpeedRunCategory]: Array<{
    _id: string
    uid: number
    stats: { clock1: string }
    discorduser: string | null
  }>
}
