import { useCallback, useEffect, useRef, useState } from 'react'

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
import cx from 'classnames'

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
import {
  anonymousBorderColor,
  anonymousBorderHoverColor,
  anonymousMarkerColor,
  ClassColorVariant,
  getClassColor,
  getColorMapping,
  lighten,
} from '../../utils/colors'
import { isAnonymousPlayer } from '../../utils/players'
import LoadingMessage from '../LoadingMessage'

import ChartFooter from './ChartFooter'
import ChartLegend from './ChartLegend'
import ChartRotateMessage from './ChartRotateMessage'
import { padMaxDuration, padMinDuration, padMinMaxDates } from './chartUtils/axisPadding'
import { createChartConfig } from './chartUtils/chartConfig'
import { parseSpeedrunData } from './chartUtils/dataParser'
import { yearBoundariesPlugin, calculateYearBoundaries } from './chartUtils/yearBoundaries'
import styles from './index.module.scss'

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
  const { isMobileAndPortrait, isMobileAndLandscape } = useDeviceOrientation()

  const { difficulty, playerLimit, maxDuration, viewMode, submissionWindow, zoomLevel } = controls

  const createDatasets = useCallback(
    (playerHistory: Map<string, DataPoint[]>, recordPoints: RecordPoint[]) => {
      const isRecordsView = viewMode === ViewMode.Records
      const isAllRunsView = viewMode === ViewMode.All
      const pointSize = 6
      const pointHoverSize = 10

      const toDataset = (player: string, runs: DataPoint[]) => {
        const isAnonymous = isAnonymousPlayer(player)
        return {
          label: player,
          data: runs,
          borderColor: isAnonymous ? anonymousBorderColor : playerColors.current[player],
          backgroundColor: isAnonymous ? anonymousMarkerColor : playerColors.current[player],
          borderWidth: isAllRunsView ? 2 : 3,
          pointHoverBorderColor: isAnonymous
            ? anonymousBorderHoverColor
            : lighten(playerColors.current[player], 20),
          pointHoverBorderWidth: isAllRunsView ? 2 : 3,
          pointStyle: isAnonymous ? 'rectRot' : 'circle',
          borderDash: isAllRunsView ? [5, 5] : [],
          pointRadius: (context: ScriptableContext<'line'>) => {
            if (isAnonymous) return pointSize

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
            if (isAnonymous) return pointHoverSize

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
          showLine: !isAnonymous,
          order: isAnonymous ? 1 : 0,
        }
      }

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
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
        // Also clear chartData, to keep the legend in sync
        setChartData(null)
      }

      const { playerHistory, allRecordPoints } = parseSpeedrunData(
        speedruns,
        playerLimit,
        maxDuration,
        viewMode,
        submissionWindow
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
      setChartData(chartInstance.current) // Update chartData with new instance
    },
    [createDatasets, submissionWindow, maxDuration, playerLimit, selectedClass, viewMode]
  )

  const { speedrunData, isLoading, isLoadingInBackground, isError, lastUpdated, refresh } =
    useSpeedrunData(selectedClass, difficulty)

  // Debug:
  // const isLoading = true

  useEffect(() => {
    if (isLoading) {
      // Destroy chart when loading
      setChartData(null)
    } else if (chartRef.current && speedrunData) {
      // Only create chart when loading is complete
      createChart(speedrunData)
    }
  }, [isLoading, speedrunData, createChart])

  useEffect(() => {
    return () => {
      if (chartInstance.current) chartInstance.current.destroy()
    }
  }, [])

  const renderChart = () => {
    const isMobilePortraitLoading = isLoading && isMobileAndPortrait

    const widthMobilePortrait = zoomLevel * 3
    const widthMobileLandscape = zoomLevel * 2
    const widthDefault = zoomLevel > 100 ? zoomLevel * 1.5 : zoomLevel
    const width = isMobileAndPortrait
      ? widthMobilePortrait
      : isMobileAndLandscape
        ? widthMobileLandscape
        : widthDefault
    const chartContainerClassName = cx(styles['chart-container'], {
      [styles['chart-container--mobilePortraitLoading']]: isMobilePortraitLoading,
    })

    const hasChartData = chartInstance.current?.data?.datasets?.length
    console.log(hasChartData)

    return (
      <div className={chartContainerClassName}>
        {isLoading && (
          <LoadingMessage selectedClass={selectedClass} selectedDifficulty={difficulty} />
        )}
        {isError && !isLoading && (
          <div className={styles['chart-container__error']}>Error loading data</div>
        )}
        {!isError && !isLoading && !hasChartData && (
          <div className={styles['chart-container__error']}>
            No runs found for the selected filters
          </div>
        )}
        {!isError && !isLoading && (
          <div
            className={styles['chart-container__chart']}
            style={{
              width: `${width}%`,
              height: `${Math.max(500, zoomLevel * 3)}px`,
              display: isLoading ? 'none' : 'block',
            }}
          >
            <canvas ref={chartRef}></canvas>
          </div>
        )}
      </div>
    )
  }

  const borderColor = getClassColor(selectedClass, ClassColorVariant.Darker)

  return (
    <div className={styles['layout']}>
      <div className={styles['container']} style={{ borderColor }}>
        {renderChart()}
        <ChartRotateMessage />
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
