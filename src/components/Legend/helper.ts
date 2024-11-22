import { Chart as ChartJS } from 'chart.js'

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

export function sortByPlayerBestTime(chart: ChartJS, playerBestTimes: Record<string, number>) {
  return [...chart.data.datasets].sort((a, b) => {
    const aTime = playerBestTimes[a.label || ''] || Infinity
    const bTime = playerBestTimes[b.label || ''] || Infinity
    return aTime - bTime
  })
}
