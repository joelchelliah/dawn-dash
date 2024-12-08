import axios from 'axios'

import {
  Difficulty,
  SpeedRunApiResponse,
  SpeedRunCategory,
  SpeedRunClass,
  SpeedRunData,
} from '../types/speedRun'

const BASE_URL = 'https://blightbane.io/api'

export const fetchSpeedruns = async (
  type: SpeedRunClass,
  difficulty: Difficulty,
  num: number
): Promise<SpeedRunData[]> => {
  const classParam = type === SpeedRunClass.Sunforge ? 'Scion' : type
  const url = `${BASE_URL}/speedruns?diff=${difficulty}&class=${classParam}&top=${num}&options=&nolimit=true`

  const response = await axios.get<[SpeedRunApiResponse]>(url)
  const category = Object.keys(response.data[0])[0] as SpeedRunCategory

  return response.data[0][category].map((run) => ({
    id: run._id,
    uid: run.uid,
    duration: run.stats?.clock1,
    discorduser: run.discorduser || null,
  }))
}
