// src/components/Chart.js
import React, { useCallback, useEffect, useRef, useState } from 'react'

import 'chartjs-adapter-moment'
import {
  Chart as ChartJS,
  LineController,
  CategoryScale,
  ChartDataset,
  PointElement,
  LineElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Title,
  ScriptableContext,
} from 'chart.js'
import moment from 'moment'

import { createChartConfig } from './chartConfig'
import { parseSpeedrunData } from './dataParser'
import { yearBoundariesPlugin, calculateYearBoundaries } from './yearBoundaries'
import './index.scss'
import { useSpeedrunData } from '../../hooks/useSpeedrunData'
import { DataPoint, RecordPoint, ViewMode } from '../../types/chart'
import { getColorMapping } from '../../utils/colors'
import Legend from '../Legend'

// Register the required components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  TimeScale,
  yearBoundariesPlugin
)

interface SpeedRun {
  discorduser: string | null
  duration: string
  uid: number
  _id: string
}

const DEFAULT_MAX_DURATION = 18
const DEFAULT_ZOOM_LEVEL = 100

const Chart: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS | null>(null)
  const [maxDuration, setMaxDuration] = useState(DEFAULT_MAX_DURATION)
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SelfImproving)
  const playerColors = useRef<Record<string, string>>({})
  const [chartData, setChartData] = useState<ChartJS | null>(null)

  const createChart = useCallback(
    (speedruns: SpeedRun[]) => {
      if (!chartRef.current) return

      if (chartInstance.current) chartInstance.current.destroy()

      const { playerHistory, allRecordPoints } = parseSpeedrunData(speedruns, maxDuration, viewMode)

      // Get colors for players
      playerColors.current = getColorMapping(playerHistory)

      // Create datasets
      const datasets = Array.from(playerHistory.entries(), ([player, runs]) => ({
        label: player,
        data: runs,
        borderColor: playerColors.current[player],
        backgroundColor: playerColors.current[player],
        pointRadius: (context: ScriptableContext<'line'>) => {
          const index = context.dataIndex
          const dataPoint = runs[index]
          const isRecord = allRecordPoints.some(
            (record: RecordPoint) =>
              record.run.x === dataPoint.x &&
              record.run.y === dataPoint.y &&
              record.player === player
          )
          return isRecord ? 6 : viewMode === 'records' ? 0 : 6
        },
        pointHoverRadius: (context: ScriptableContext<'line'>) => {
          const index = context.dataIndex
          const dataPoint = runs[index]
          const isRecord = allRecordPoints.some(
            (record: RecordPoint) =>
              record.run.x === dataPoint.x &&
              record.run.y === dataPoint.y &&
              record.player === player
          )
          return isRecord ? 8 : viewMode === 'records' ? 0 : 8
        },
        stepped: 'before',
        tension: 0,
        showLine: true,
      })).filter((dataset) => dataset.data.length > 0)

      if (datasets.length === 0) {
        console.warn('No valid data to display')
        return
      }

      // Calculate chart boundaries
      const allDates = datasets.flatMap((ds) => ds.data.map((d) => d.x))
      const minDate = Math.min(...allDates)
      const maxDate = Math.max(...allDates)

      // Calculate padding
      const totalDays = moment(maxDate).diff(moment(minDate), 'days')
      const paddingAmount = 0.025
      const paddingDays = Math.ceil(totalDays * paddingAmount)
      const paddedMinDate = moment(minDate).subtract(paddingDays, 'days').valueOf()
      const paddedMaxDate = moment(maxDate).add(2, 'days').valueOf()

      calculateYearBoundaries(minDate, maxDate)

      // Find the fastest run time
      const allRunTimes = datasets.flatMap(({ data }) => data.map(({ y }) => y))
      const fastestTime = Math.min(...allRunTimes)
      const paddedMinDuration = Math.max(0, fastestTime - 0.25)
      const paddedMaxDuration = maxDuration + 0.25

      // Create new chart
      const ctx = chartRef.current.getContext('2d')
      if (!ctx) return

      chartInstance.current = new ChartJS(ctx, {
        type: 'line',
        data: { datasets: datasets as ChartDataset<'line', DataPoint[]>[] },
        options: createChartConfig(
          paddedMinDate,
          paddedMaxDate,
          paddedMinDuration,
          paddedMaxDuration,
          viewMode,
          allRecordPoints
        ),
      })

      setChartData(chartInstance.current)
    },
    [maxDuration, viewMode]
  )

  const { speedrunData, isLoadingSpeedrunData, isErrorSpeedrunData } = useSpeedrunData('Scion')

  useEffect(() => {
    if (speedrunData) createChart(speedrunData)
  }, [createChart, maxDuration, zoomLevel, speedrunData])

  return (
    <div className="speedrun-chart">
      <h2 className="chart-title">Sunforge Speedrun History</h2>
      <div className="controls">
        <label htmlFor="maxDuration">Max duration: </label>
        <select
          id="maxDuration"
          value={maxDuration}
          onChange={(e) => setMaxDuration(parseInt(e.target.value))}
        >
          <option value="12">12 minutes</option>
          <option value="14">14 minutes</option>
          <option value="18">18 minutes</option>
          <option value="24">24 minutes</option>
          <option value="32">32 minutes</option>
          <option value="999999">All runs</option>
        </select>

        <label htmlFor="zoomLevel">Zoom level: </label>
        <select
          id="zoomLevel"
          value={zoomLevel}
          onChange={(e) => setZoomLevel(parseInt(e.target.value))}
        >
          <option value="100">100%</option>
          <option value="200">200%</option>
          <option value="300">300%</option>
          <option value="400">400%</option>
          <option value="500">500%</option>
        </select>

        <label htmlFor="viewMode">Show: </label>
        <select
          id="viewMode"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
        >
          <option value="self-improving">Self-improving runs</option>
          <option value="records">Record-breaking runs</option>
        </select>
      </div>
      <div className="chart-layout">
        <div className="outer-container">
          {isLoadingSpeedrunData && <div className="chart-message">Loading data...</div>}
          {isErrorSpeedrunData && <div className="chart-message error">Error loading data</div>}
          {!isLoadingSpeedrunData && !isErrorSpeedrunData && (
            <div
              className="chart-container"
              style={{ width: `${zoomLevel}%`, height: `${Math.max(100, zoomLevel / 1.5)}%` }}
            >
              <canvas ref={chartRef}></canvas>
            </div>
          )}
        </div>

        <Legend chart={chartData} playerColors={playerColors.current} />
      </div>
    </div>
  )
}

export default Chart
