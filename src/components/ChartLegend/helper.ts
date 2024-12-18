import { Chart as ChartJS } from 'chart.js'

/**
 * Get the best time for each player.
 *
 * @param chart - The chart instance.
 */
export function getPlayerBestTimes(chart: ChartJS) {
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
export function sortByPlayerBestTime(chart: ChartJS, playerBestTimes: Record<string, number>) {
  return [...chart.data.datasets].sort((a, b) => {
    const aTime = playerBestTimes[a.label || ''] || Infinity
    const bTime = playerBestTimes[b.label || ''] || Infinity
    return aTime - bTime
  })
}
