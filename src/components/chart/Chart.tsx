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
import { createExternalLegend } from './legend'
import { yearBoundariesPlugin, yearBoundaries } from './yearBoundaries'
import './Chart.scss'

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
  discorduser: string
  duration: string
  uid: string
}

interface DataPoint {
  x: number
  y: number
}

const DEFAULT_MAX_DURATION = 18
const DEFAULT_ZOOM_LEVEL = 100

const Chart: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS | null>(null)
  const [maxDuration, setMaxDuration] = useState(DEFAULT_MAX_DURATION)
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL)

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

  const createChart = useCallback(
    (speedruns: SpeedRun[]) => {
      if (!chartRef.current) return

      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }

      const playerHistory = new Map<string, DataPoint[]>()

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

            const timestamp = parseInt(run.uid)
            if (!isNaN(timestamp)) {
              playerHistory.get(player)?.push({
                x: timestamp,
                y: totalMinutes,
              })
            }
          }
        }
      })
      // Sort and filter runs
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
      // Filter out players with fewer than 2 runs
      for (const [player, runs] of Array.from(playerHistory.entries())) {
        if (runs.length <= 1) {
          playerHistory.delete(player)
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
          pointRadius: 6,
          pointHoverRadius: 8,
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
          paddedMaxDuration
        ),
      })

      createExternalLegend(chartInstance.current)
    },
    [maxDuration]
  )

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/speedruns.json')
      const speedruns = await response.json()
      createChart(speedruns)
    }

    fetchData()
  }, [createChart, maxDuration, zoomLevel])

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
          <option value="150">150%</option>
          <option value="200">200%</option>
          <option value="300">300%</option>
          <option value="400">400%</option>
          <option value="500">500%</option>
          <option value="1000">1000%</option>
        </select>
      </div>
      <div className="chart-layout">
        <div className="outer-container">
          <div
            className="chart-container"
            style={{ width: `${zoomLevel}%`, height: `${Math.max(100, zoomLevel / 1.5)}%` }}
          >
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
        <div id="legend-container"></div>
      </div>
    </div>
  )
}

export default Chart
