import axios from 'axios'

import {
  Difficulty,
  SpeedRunApiResponse,
  SpeedRunCategory,
  SpeedRunClass,
  SpeedRunData,
} from '../types/speedRun'
import { parseVersion } from '../utils/version'

const BASE_URL = 'https://blightbane.io/api'

export const fetchSpeedruns = async (
  type: SpeedRunClass,
  difficulty: Difficulty,
  num: number
): Promise<SpeedRunData[]> => {
  const classParam = type === SpeedRunClass.Sunforge ? 'Scion' : type
  const url = `${BASE_URL}/speedruns?diff=${difficulty}&class=${classParam}&top=${num}&options=&nolimit=true`

  try {
    const response = await axios.get<[SpeedRunApiResponse]>(url)

    if (!response.data?.[0]) {
      console.error('Invalid API response structure:', response.data)
      return []
    }

    const category = Object.keys(response.data[0])[0] as SpeedRunCategory
    return response.data[0][category]
      .filter((run) => !!run.version) // Ignore runs with no version
      .map((run) => ({
        id: run._id,
        uid: run.uid,
        version: parseVersion(run.version),
        duration: run.stats?.clock1,
        discorduser: run.discorduser || null,
      }))
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}
