import { Chart as ChartJS } from 'chart.js'

import { DataPoint } from '../types/chart'
import { SpeedRunData } from '../types/speedRun'

// To mark runs that are not associated with discord users
const ANONYMOUS_PLAYER = '__ANONYMOUS_PLAYER__'

export function getPlayerName(run: SpeedRunData) {
  return run.discorduser ?? ANONYMOUS_PLAYER
}

export function removeAnonymousPlayers(playerHistory: Map<string, DataPoint[]>) {
  const filteredMap = new Map(playerHistory)

  filteredMap.delete(ANONYMOUS_PLAYER)

  return filteredMap
}

export function isAnonymousPlayer(player: string) {
  return player === ANONYMOUS_PLAYER
}

/**
 * Get the best time for each player.
 *
 * @param chart - The chart instance.
 */
export function getPlayerBestTimes(chart: ChartJS): Record<string, number> {
  return chart.data.datasets.reduce<Record<string, number>>((acc, dataset) => {
    const player = dataset.label || ''
    if (!dataset.data.length) return acc

    const data = dataset.data as { y: number }[]
    const bestTime = Math.min(...data.map((point) => point.y))
    acc[player] = bestTime
    return acc
  }, {})
}

/**
 * Sort the chart's datasets by the player's best time.
 *
 * @param chart - The chart instance.
 * @param playerBestTimes - A map of player names to their best times.
 */
export function sortedDatasetsByPlayerBestTime(
  chart: ChartJS,
  playerBestTimes: Record<string, number>
) {
  return [...chart.data.datasets].sort((a, b) => {
    const aTime = playerBestTimes[a.label || ''] || Infinity
    const bTime = playerBestTimes[b.label || ''] || Infinity
    return aTime - bTime
  })
}
