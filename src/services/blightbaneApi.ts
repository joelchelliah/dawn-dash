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
  const start = performance.now()
  const url = `${BASE_URL}/speedruns?diff=${difficulty}&class=${type}&top=${num}&options=&nolimit=true`

  const response = await axios.get<[SpeedRunApiResponse]>(url)
  const end = performance.now()

  console.log(`Speedruns fetch [${type}-${difficulty}] took ${(end - start).toFixed(2)}ms`)

  const category = Object.keys(response.data[0])[0] as SpeedRunCategory

  return response.data[0][category].map((run) => ({
    _id: run._id,
    uid: run.uid,
    duration: run.stats?.clock1,
    discorduser: run.discorduser || null,
  }))
}
