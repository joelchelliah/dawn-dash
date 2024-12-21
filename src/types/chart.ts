import { ChartDataset, ChartOptions } from 'chart.js'

import { Difficulty, GameVersion } from './speedRun'

export interface ChartConfig {
  type: 'line'
  data: { datasets: Dataset[] }
  options: ChartOptions<'line'>
}

export type Dataset = ChartDataset<'line', DataPoint[]>

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
  All = 'all',
  Improvements = 'improvements',
  Records = 'records',
}

export interface ChartControlState {
  difficulty: Difficulty
  setDifficulty: (value: Difficulty) => void
  playerLimit: number
  setPlayerLimit: (value: number) => void
  maxDuration: number
  setMaxDuration: (value: number) => void
  viewMode: ViewMode
  setViewMode: (value: ViewMode) => void
  zoomLevel: number
  setZoomLevel: (value: number) => void
  gameVersion: GameVersion
  setGameVersion: (value: GameVersion) => void
}
