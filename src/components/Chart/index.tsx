import { useCallback, useEffect, useRef, useState } from 'react'

import 'chartjs-adapter-moment'
import {
  ScriptableContext,
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
} from 'chart.js'

import { useDeviceOrientation } from '../../hooks/useDeviceOrientation'
import { useFromNow } from '../../hooks/useFromNow'
import { useSpeedrunData } from '../../hooks/useSpeedrunData'
import { ChartConfig, ChartControlState, DataPoint, RecordPoint } from '../../types/chart'
import { SpeedRunClass, SpeedRunData } from '../../types/speedRun'
import { getColorMapping } from '../../utils/colors'
import Legend from '../ChartLegend'
import { getTopPlayers } from '../ChartLegend/helper'
import LoadingDots from '../LoadingDots'
import LoadingMessage from '../LoadingMessage'

import { padMaxDuration, padMinDuration, padMinMaxDates } from './chartAxisPadding'
import { createChartConfigOptions } from './chartConfig'
import { parseSpeedrunData } from './dataParser'
import { yearBoundariesPlugin, calculateYearBoundaries } from './yearBoundaries'

import './index.scss'

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

interface ChartProps {
  selectedClass: SpeedRunClass
  controls: ChartControlState
}

function Chart({ selectedClass, controls }: ChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS<'line', DataPoint[]> | null>(null)
  const playerColors = useRef<Record<string, string>>({})
  const [chartData, setChartData] = useState<ChartJS | null>(null)
  const { isMobile, isMobileAndPortrait, isMobileAndLandscape } = useDeviceOrientation()
  const { difficulty, playerLimit, maxDuration, viewMode, zoomLevel } = controls

  const createChart = useCallback(
    (speedruns: SpeedRunData[]) => {
      if (!chartRef.current) {
        console.warn('No chart ref available!')
        return
      }

      // Cleanup old chart
      if (chartInstance.current) chartInstance.current.destroy()

      const { playerHistory, allRecordPoints } = parseSpeedrunData(speedruns, maxDuration, viewMode)
      playerColors.current = getColorMapping(playerHistory)

      let filteredPlayerHistory = playerHistory
      if (playerLimit) {
        const playerBestTimes = Array.from(playerHistory.entries()).reduce<Record<string, number>>(
          (acc, [player, runs]) => {
            acc[player] = Math.min(...runs.map((run) => run.y))
            return acc
          },
          {}
        )

        const topPlayers = getTopPlayers(playerBestTimes, playerLimit)
        filteredPlayerHistory = new Map(
          Array.from(playerHistory.entries()).filter(([player]) => topPlayers.includes(player))
        )
      }

      const datasets = Array.from(filteredPlayerHistory.entries(), ([player, runs]) => ({
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

      const allDates = datasets.flatMap(({ data }) => data.map(({ x }) => x))
      const { paddedMinDate, paddedMaxDate } = padMinMaxDates(allDates)

      calculateYearBoundaries(paddedMinDate, paddedMaxDate)

      const allRunTimes = datasets.flatMap(({ data }) => data.map(({ y }) => y))
      const fastestTime = Math.min(...allRunTimes)
      const slowestTime = Math.max(...allRunTimes)
      const paddedMinDuration = padMinDuration(fastestTime, selectedClass)
      const paddedMaxDuration = padMaxDuration(slowestTime, selectedClass, maxDuration)

      const ctx = chartRef.current.getContext('2d')
      if (!ctx) return

      const config: ChartConfig = {
        type: 'line',
        data: { datasets: datasets as ChartDataset<'line', DataPoint[]>[] },
        options: createChartConfigOptions(
          paddedMinDate,
          paddedMaxDate,
          paddedMinDuration,
          paddedMaxDuration
        ),
      }

      chartInstance.current = new ChartJS(ctx, config)
      setChartData(chartInstance.current)
    },
    [maxDuration, viewMode, playerLimit, selectedClass]
  )

  const { speedrunData, isLoading, isLoadingInBackground, isError, lastUpdated, refresh } =
    useSpeedrunData(selectedClass, difficulty)

  const fromNow = useFromNow(lastUpdated, 'Data from')

  useEffect(() => {
    if (chartRef.current && speedrunData) createChart(speedrunData)
  }, [speedrunData, createChart])

  useEffect(() => {
    if (isLoading) setChartData(null)
  }, [isLoading])

  useEffect(() => {
    return () => {
      if (chartInstance.current) chartInstance.current.destroy()
    }
  }, [])

  const renderChartFooter = () => {
    if (isLoadingInBackground) return <LoadingDots text="Loading fresh data" />
    if (!fromNow) return null
    return (
      <>
        {fromNow}
        <button onClick={refresh} className="refresh-button">
          Refresh
        </button>
      </>
    )
  }

  return (
    <div className="chart-layout">
      <div className="outer-container">
        <div className="chart-scroll-container">
          {isLoading && (
            <LoadingMessage selectedClass={selectedClass} selectedDifficulty={difficulty} />
          )}
          {isError && !isLoading && <div className="chart-message error">Error loading data</div>}
          <div
            className="chart-container"
            style={{
              width: `${zoomLevel > 100 ? zoomLevel * 1.5 : zoomLevel}%`,
              height: `${Math.max(500, zoomLevel * 3)}px`,
              display:
                (!isMobile || isMobileAndLandscape) && !isLoading && !isError ? 'block' : 'none',
            }}
          >
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
        {isMobileAndPortrait && (
          <div className="rotate-device-message">
            <span className="rotate-icon">📱</span>
            Rotate your device to landscape mode to view the chart!
          </div>
        )}
        <div className="last-updated">{renderChartFooter()}</div>
      </div>
      <Legend chart={chartData} playerColors={playerColors.current} />
    </div>
  )
}

export default Chart
