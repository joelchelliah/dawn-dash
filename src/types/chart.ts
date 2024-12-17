import { ChartDataset, ChartOptions } from 'chart.js'

import { GameVersion, Difficulty } from './speedRun'

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
  gameVersions: Set<GameVersion>
  setGameVersions: (value: Set<GameVersion>) => void
}
