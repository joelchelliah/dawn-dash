import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import 'chartjs-adapter-moment'
import {
  ScriptableContext,
  Chart as ChartJS,
  LineController,
  CategoryScale,
  PointElement,
  LineElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Title,
} from 'chart.js'

import ChartFooter from '../../components/ChartFooter'
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation'
import { useSpeedrunData } from '../../hooks/useSpeedrunData'
import {
  ChartConfig,
  ChartControlState,
  DataPoint,
  Dataset,
  RecordPoint,
  ViewMode,
} from '../../types/chart'
import { SpeedRunClass, SpeedRunData } from '../../types/speedRun'
import { ClassColorVariant, getClassColor, getColorMapping } from '../../utils/colors'
import { parseVersion, versionToString } from '../../utils/version'
import ChartLegend from '../ChartLegend'
import LoadingMessage from '../LoadingMessage'
import RotateDeviceMessage from '../RotateDeviceMessage'

import { padMaxDuration, padMinDuration, padMinMaxDates } from './chartAxisPadding'
import { createChartConfig } from './chartConfig'
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
  controls: ChartControlState
  selectedClass: SpeedRunClass
  onPlayerClick: (player: string, timestamp: number) => void
}

function Chart({ selectedClass, controls, onPlayerClick }: ChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS<'line', DataPoint[]> | null>(null)
  const playerColors = useRef<Record<string, string>>({})
  const [chartData, setChartData] = useState<ChartJS | null>(null)
  const { isMobileAndPortrait } = useDeviceOrientation()

  const { difficulty, playerLimit, maxDuration, viewMode, gameVersion, zoomLevel } = controls

  const gameVersionString = useMemo(() => versionToString(gameVersion), [gameVersion])

  const createDatasets = useCallback(
    (playerHistory: Map<string, DataPoint[]>, recordPoints: RecordPoint[]) => {
      const isRecordsView = viewMode === ViewMode.Records
      const pointSize = 6
      const pointHoverSize = 10

      const toDataset = (player: string, runs: DataPoint[]) => ({
        label: player,
        data: runs,
        borderColor: playerColors.current[player],
        backgroundColor: playerColors.current[player],
        pointRadius: (context: ScriptableContext<'line'>) => {
          const index = context.dataIndex
          const dataPoint = runs[index]
          const isRecord = recordPoints.some(
            (record: RecordPoint) =>
              record.run.x === dataPoint.x &&
              record.run.y === dataPoint.y &&
              record.player === player
          )
          return isRecordsView ? (isRecord ? pointSize : 0) : pointSize
        },
        pointHoverRadius: (context: ScriptableContext<'line'>) => {
          const index = context.dataIndex
          const dataPoint = runs[index]
          const isRecord = recordPoints.some(
            (record: RecordPoint) =>
              record.run.x === dataPoint.x &&
              record.run.y === dataPoint.y &&
              record.player === player
          )

          return isRecordsView ? (isRecord ? pointHoverSize : 0) : pointHoverSize
        },
        stepped: 'before',
        tension: 0,
        showLine: true,
      })

      return Array.from(playerHistory.entries(), ([player, runs]) =>
        toDataset(player, runs)
      ).filter(({ data }) => data.length > 0)
    },
    [viewMode]
  )

  const createChart = useCallback(
    (speedruns: SpeedRunData[]) => {
      if (!chartRef.current) {
        console.warn('No chart ref available!')
        return
      }

      // Cleanup old chart
      if (chartInstance.current) chartInstance.current.destroy()

      // NB: Re-parsing stringified version to avoid rerender issues when creating chart...
      const parsedVersion = parseVersion(gameVersionString)
      const { playerHistory, allRecordPoints } = parseSpeedrunData(
        speedruns,
        playerLimit,
        maxDuration,
        viewMode,
        parsedVersion
      )
      playerColors.current = getColorMapping(playerHistory)

      const datasets = createDatasets(playerHistory, allRecordPoints)

      if (datasets.length === 0) {
        console.warn('No valid data to display')
        return
      }

      const ctx = chartRef.current.getContext('2d')
      if (!ctx) return

      const allDates = datasets.flatMap(({ data }) => data.map(({ x }) => x))
      const { paddedMinDate, paddedMaxDate } = padMinMaxDates(allDates)

      calculateYearBoundaries(paddedMinDate, paddedMaxDate)

      const allRunTimes = datasets.flatMap(({ data }) => data.map(({ y }) => y))
      const fastestTime = Math.min(...allRunTimes)
      const slowestTime = Math.max(...allRunTimes)
      const paddedMinDuration = padMinDuration(fastestTime, selectedClass)
      const paddedMaxDuration = padMaxDuration(slowestTime, selectedClass, maxDuration)

      const config: ChartConfig = createChartConfig(
        datasets as Dataset[],
        paddedMinDate,
        paddedMaxDate,
        paddedMinDuration,
        paddedMaxDuration
      )
      chartInstance.current = new ChartJS(ctx, config)
      setChartData(chartInstance.current)
    },
    [createDatasets, gameVersionString, maxDuration, playerLimit, selectedClass, viewMode]
  )

  const { speedrunData, isLoading, isLoadingInBackground, isError, lastUpdated, refresh } =
    useSpeedrunData(selectedClass, difficulty)

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

  const renderChart = () => {
    const isMobilePortraitLoading = isLoading && isMobileAndPortrait

    const widthMobilePortrait = zoomLevel * 2
    const widthDefault = zoomLevel > 100 ? zoomLevel * 1.5 : zoomLevel
    const width = isMobileAndPortrait ? widthMobilePortrait : widthDefault

    return (
      <div
        className={`chart-scroll-container ${isMobilePortraitLoading ? 'mobile-portrait-loading' : ''}`}
      >
        {isLoading && (
          <LoadingMessage selectedClass={selectedClass} selectedDifficulty={difficulty} />
        )}
        {isError && !isLoading && <div className="chart-message error">Error loading data</div>}
        <div
          className="chart-container"
          style={{
            width: `${width}%`,
            height: `${Math.max(500, zoomLevel * 3)}px`,
            display: isLoading ? 'none' : 'block',
          }}
        >
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    )
  }

  const borderColor = getClassColor(selectedClass, ClassColorVariant.Border)

  return (
    <div className="chart-layout">
      <div className="outer-container" style={{ borderColor }}>
        {renderChart()}
        <RotateDeviceMessage />
        <ChartFooter
          isLoading={isLoading}
          isLoadingInBackground={isLoadingInBackground}
          lastUpdated={lastUpdated}
          selectedClass={selectedClass}
          refresh={refresh}
        />
      </div>
      <ChartLegend
        chart={chartData}
        playerColors={playerColors.current}
        selectedClass={selectedClass}
        isLoading={isLoading}
        onPlayerClick={onPlayerClick}
      />
    </div>
  )
}

export default Chart
