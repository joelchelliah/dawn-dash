import axios from 'axios'
import useSWR from 'swr'

import { SpeedRunApiResponse, SpeedRunCategory, SpeedRunData } from '../types/speedRun'

export function useSpeedrunData(type: string, num: number) {
  const diff = 'Impossible'
  const { data, error, isLoading } = useSWR<SpeedRunData[]>(
    `https://blightbane.io/api/speedruns?diff=${diff}&class=${type}&top=${num}&options=&nolimit=true`,
    fetcher,
    {
      revalidateOnFocus: false, // Don't fetch again when window regains focus
      revalidateOnReconnect: false, // Don't fetch again on reconnection
      refreshInterval: 3 * 60 * 1000,
    }
  )

  return {
    speedrunData: data,
    isLoadingSpeedrunData: isLoading,
    isErrorSpeedrunData: error,
  }
}

const fetcher = async (url: string): Promise<SpeedRunData[]> => {
  const start = performance.now()
  const response = await axios.get<[SpeedRunApiResponse]>(url)
  const end = performance.now()
  console.log(`Speedruns fetch took ${(end - start).toFixed(2)}ms`)

  const category = Object.keys(response.data[0])[0] as SpeedRunCategory
  return response.data[0][category].map((run) => ({
    _id: run._id,
    uid: run.uid,
    duration: run.stats?.clock1,
    discorduser: run.discorduser || null,
  }))
}
