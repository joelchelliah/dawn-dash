import useSWR from 'swr'

import { fetchSpeedruns } from '../services/api'
import { SpeedRunData } from '../types/speedRun'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useSpeedrunData(type: string, num: number) {
  const { data, error, isLoading } = useSWR<SpeedRunData[]>(
    ['speedruns', type, num],
    () => fetchSpeedruns(type, num),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: REFRESH_INTERVAL,
    }
  )

  return {
    speedrunData: data,
    isLoadingSpeedrunData: isLoading,
    isErrorSpeedrunData: error,
  }
}
