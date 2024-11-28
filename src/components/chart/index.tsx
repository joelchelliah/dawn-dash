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
import moment from 'moment'

import { useChartControlState } from '../../hooks/useChartControlState'
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation'
import { useSpeedrunData } from '../../hooks/useSpeedrunData'
import { ChartConfig, DataPoint, RecordPoint } from '../../types/chart'
import { SpeedRunClass, SpeedRunData } from '../../types/speedRun'
import { getColorMapping } from '../../utils/colors'
import ChartControls from '../ChartControls'
import Legend from '../ChartLegend'
import { getTopPlayers } from '../ChartLegend/helper'
import LoadingMessage from '../LoadingMessage'

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
}

function Chart({ selectedClass }: ChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS<'line', DataPoint[]> | null>(null)
  const playerColors = useRef<Record<string, string>>({})
  const [chartData, setChartData] = useState<ChartJS | null>(null)
  const { isMobile, isMobileAndPortrait, isMobileAndLandscape } = useDeviceOrientation()

  const controls = useChartControlState(selectedClass)
  const { maxDuration, viewMode, playerLimit, zoomLevel } = controls

  const createChart = useCallback(
    (speedruns: SpeedRunData[]) => {
      if (!chartRef.current) return

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

      const allDates = datasets.flatMap((ds) => ds.data.map((d) => d.x))
      const minDate = Math.min(...allDates)
      const maxDate = Math.max(...allDates)

      const totalDays = moment(maxDate).diff(moment(minDate), 'days')
      const paddingAmount = 0.025
      const paddingDays = Math.ceil(totalDays * paddingAmount)
      const paddedMinDate = moment(minDate).subtract(paddingDays, 'days').valueOf()
      const paddedMaxDate = moment(maxDate).add(2, 'days').valueOf()

      calculateYearBoundaries(minDate, maxDate)

      const allRunTimes = datasets.flatMap(({ data }) => data.map(({ y }) => y))
      const fastestTime = Math.min(...allRunTimes)
      const slowestTime = Math.max(...allRunTimes)
      const paddedMinDuration = Math.max(0, fastestTime - 0.25)
      const paddedMaxDuration = Math.min(slowestTime + 0.25, maxDuration)

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
    [maxDuration, viewMode, playerLimit]
  )

  const { speedrunData, isLoadingSpeedrunData, isErrorSpeedrunData } =
    useSpeedrunData(selectedClass)

  useEffect(() => {
    if (speedrunData) {
      console.log('calling createChart')
      createChart(speedrunData)
    }
  }, [createChart, maxDuration, zoomLevel, speedrunData])

  useEffect(() => {
    if (isLoadingSpeedrunData) {
      setChartData(null)
    }
  }, [isLoadingSpeedrunData])

  const renderChart = () => {
    if (isLoadingSpeedrunData) return <LoadingMessage selectedClass={selectedClass} />
    if (isErrorSpeedrunData) return <div className="chart-message error">Error loading data</div>

    return (
      <div
        className="chart-container"
        style={{
          width: `${zoomLevel > 100 ? zoomLevel * 1.5 : zoomLevel}%`,
          height: `${Math.max(500, zoomLevel * 4)}px`,
          display: !isMobile || isMobileAndLandscape ? 'block' : 'none',
        }}
      >
        <canvas ref={chartRef}></canvas>
      </div>
    )
  }

  return (
    <div className="speedrun-chart">
      <ChartControls controls={controls} selectedClass={selectedClass} />
      <div className="chart-layout">
        <div className="outer-container">
          {renderChart()}
          {isMobileAndPortrait && (
            <div className="rotate-device-message">
              <span className="rotate-icon">📱</span>
              Rotate your device to landscape mode to view the chart!
            </div>
          )}
        </div>
        <Legend chart={chartData} playerColors={playerColors.current} />
      </div>
    </div>
  )
}

export default Chart
