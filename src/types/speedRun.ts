export interface SpeedRunData {
  _id: string
  uid: number
  duration: string
  discorduser: string | null
}

export type SpeedRunCategory = 'Scion-Impossible'

export type SpeedRunApiResponse = {
  [key in SpeedRunCategory]: Array<{
    _id: string
    uid: number
    stats: { clock1: string }
    discorduser: string | null
  }>
}
