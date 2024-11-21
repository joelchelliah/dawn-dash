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
  Legend,
  Title,
} from 'chart.js'
import moment from 'moment'

import { createChartConfig } from './chartConfig'
import { createLegend } from './legend'
import { yearBoundariesPlugin, yearBoundaries } from './yearBoundaries'
import './Chart.scss'
import { useSpeedrunData } from '../../hooks/useSpeedrunData'
import { DataPoint } from '../../types/chart'

// Register the required components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
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

type ViewMode = 'all' | 'records'

const Chart: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS | null>(null)
  const [maxDuration, setMaxDuration] = useState(DEFAULT_MAX_DURATION)
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL)
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  /**
   * Generates a color palette for the chart lines
   * Could be moved to a separate utils file
   */
  const generateColors = (count: number): string[] => {
    const colors: string[] = []
    const baseHues = [0, 60, 120, 180, 240, 300]
    const saturation = 70
    const lightness = 60

    for (let i = 0; i < count; i++) {
      const hue = baseHues[i % baseHues.length] + Math.floor(i / baseHues.length) * 30
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
    }

    return colors
  }

  /**
   * Main chart creation function
   * Could be split into multiple files:
   * - Data processing (parseSpeedrunData.ts)
   * - Record-breaking logic (recordBreakingView.ts)
   * - All runs logic (allRunsView.ts)
   * - Chart initialization (initializeChart.ts)
   */
  const createChart = useCallback(
    (speedruns: SpeedRun[]) => {
      if (!chartRef.current) return

      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }

      const playerHistory = new Map<string, DataPoint[]>()
      const allRecordPoints: Array<{ player: string; run: DataPoint }> = []

      // Process speedruns data
      speedruns.reverse().forEach((run) => {
        const player = run.discorduser
        const durationMatch = run.duration.match(
          /Duration: (?:\*\*)?(\d{2}):(\d{2}):(\d{2})(?:\*\*)?/
        )

        if (player && durationMatch) {
          const hours = parseInt(durationMatch[1])
          const minutes = parseInt(durationMatch[2])
          const seconds = parseInt(durationMatch[3])
          const totalMinutes = hours * 60 + minutes + seconds / 60

          if (totalMinutes <= maxDuration) {
            if (!playerHistory.has(player)) {
              playerHistory.set(player, [])
            }

            const timestamp = run.uid
            if (!isNaN(timestamp)) {
              playerHistory.get(player)?.push({
                x: timestamp,
                y: totalMinutes,
              })
            }
          }
        }
      })

      // Handle different view modes
      if (viewMode === 'records') {
        let globalBestTime = Infinity

        // Sort and find record-breaking runs
        const allRuns = Array.from(playerHistory.entries())
          .flatMap(([player, runs]) => runs.map((run) => ({ player, run })))
          .sort((a, b) => a.run.x - b.run.x)

        allRuns.forEach(({ player, run }) => {
          if (run.y < globalBestTime) {
            globalBestTime = run.y
            allRecordPoints.push({ player, run })
          }
        })

        // Clear existing history
        playerHistory.clear()

        // Create segments between record points
        for (let i = 0; i < allRecordPoints.length; i++) {
          const current = allRecordPoints[i]
          const next = allRecordPoints[i + 1]

          if (!playerHistory.has(current.player)) {
            playerHistory.set(current.player, [])
          }

          // Add current record point (only once)
          const currentPoints = playerHistory.get(current.player) || []
          if (
            !currentPoints.some((point) => point.x === current.run.x && point.y === current.run.y)
          ) {
            playerHistory.get(current.player)?.push(current.run)
          }

          if (next) {
            // Add horizontal line
            playerHistory.get(current.player)?.push({ x: next.run.x, y: current.run.y })

            // Add vertical line to next player's segment
            if (!playerHistory.has(next.player)) {
              playerHistory.set(next.player, [])
            }
            playerHistory.get(next.player)?.push({ x: next.run.x, y: current.run.y })
          }
        }
      } else {
        // Original "all runs" logic
        for (const [player, runs] of Array.from(playerHistory.entries())) {
          runs.sort((a: DataPoint, b: DataPoint) => a.x - b.x)

          let bestTime = Infinity
          const improvedRuns = runs.filter((run: DataPoint) => {
            if (run.y >= bestTime) return false
            bestTime = run.y
            return true
          })

          playerHistory.set(player, improvedRuns)
        }
      }

      // Filter out players with fewer than 2 runs (only for 'all' mode)
      if (viewMode === 'all') {
        for (const [player, runs] of Array.from(playerHistory.entries())) {
          if (runs.length <= 1) {
            playerHistory.delete(player)
          }
        }
      }

      const colors = generateColors(playerHistory.size)
      const playerColors = Object.fromEntries(
        Array.from(playerHistory.keys()).map((player, i) => [player, colors[i]])
      )

      const datasets = Array.from(playerHistory.entries())
        .filter(([_, runs]) => runs.length > 0)
        .map(([player, runs]) => ({
          label: player,
          data: runs,
          borderColor: playerColors[player],
          backgroundColor: playerColors[player],
          pointRadius: (context: any) => {
            const index = context.dataIndex
            const dataPoint = runs[index]
            if (viewMode === 'records') {
              const isRecord = allRecordPoints.some(
                (record) =>
                  record.run.x === dataPoint.x &&
                  record.run.y === dataPoint.y &&
                  record.player === player
              )
              return isRecord ? 6 : 0
            } else {
              return 6
            }
          },
          pointHoverRadius: (context: any) => {
            const index = context.dataIndex
            const dataPoint = runs[index]
            if (viewMode === 'records') {
              const isRecord = allRecordPoints.some(
                (record) =>
                  record.run.x === dataPoint.x &&
                  record.run.y === dataPoint.y &&
                  record.player === player
              )
              return isRecord ? 8 : 0
            } else {
              return 8
            }
          },
          stepped: 'before',
          tension: 0,
          showLine: true,
        }))

      if (datasets.length === 0) {
        console.warn('No valid data to display')
        return
      }

      const allDates = datasets.flatMap((ds) => ds.data.map((d) => d.x))
      const minDate = Math.min(...allDates)
      const maxDate = Math.max(...allDates)

      // Calculate padding as 10% of the total date range, rounded up
      const totalDays = moment(maxDate).diff(moment(minDate), 'days')
      const paddingAmount = 0.025
      const paddingDays = Math.ceil(totalDays * paddingAmount)
      const paddedMinDate = moment(minDate).subtract(paddingDays, 'days').valueOf()
      const paddedMaxDate = moment(maxDate).add(1, 'days').valueOf()

      // Clear existing year boundaries
      yearBoundaries.length = 0

      // Calculate year boundaries
      let currentYear = moment(minDate).year()
      const endYear = moment(maxDate).year()
      while (currentYear <= endYear) {
        const yearStart = moment(`${currentYear}-01-01`).startOf('day').valueOf()
        if (yearStart >= minDate && yearStart <= maxDate) {
          yearBoundaries.push(yearStart)
        }
        currentYear++
      }

      // Find the fastest run time across all players
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

      createLegend(chartInstance.current)
    },
    [maxDuration, viewMode]
  )

  const { speedrunData, isLoadingSpeedrunData, isErrorSpeedrunData } = useSpeedrunData(
    'Scion',
    1000
  )

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
          <option value="all">All runs</option>
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
        <div id="legend-container"></div>
      </div>
    </div>
  )
}

export default Chart
