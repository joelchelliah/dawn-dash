import { ChartDataset, ChartOptions } from 'chart.js'

export interface ChartConfig {
  type: 'line'
  data: { datasets: ChartDataset<'line', DataPoint[]>[] }
  options: ChartOptions<'line'>
}

export interface DataPoint {
  x: number
  y: number
}

export interface RecordPoint {
  player: string
  run: DataPoint
}

export interface ParsedPlayerData {
  playerHistory: Map<string, DataPoint[]>
  allRecordPoints: Array<RecordPoint>
}

export enum ViewMode {
  SelfImproving = 'self-improving',
  Records = 'records',
}
