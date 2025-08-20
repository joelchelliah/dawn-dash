import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

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

import { createCx } from '@/shared/utils/classnames'
import { useDeviceOrientation } from '@/shared/hooks/useDeviceOrientation'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { ClassColorVariant, getClassColor, lighten } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import {
  ChartConfig,
  ChartControlState,
  DataPoint,
  Dataset,
  RecordPoint,
  ViewMode,
} from '@/speedruns/types/chart'
import { SpeedRunData } from '@/speedruns/types/speedRun'
import {
  anonymousBorderColor,
  anonymousBorderHoverColor,
  anonymousMarkerColor,
  desaturate,
  getColorMapping,
  saturate,
} from '@/speedruns/utils/colors'
import { isAnonymousPlayer } from '@/speedruns/utils/players'
import { useSpeedrunData } from '@/speedruns/hooks/useSpeedrunData'

import ClassLoadingMessage from '../ClassLoadingMessage'

import ChartErrorMessage from './ChartErrorMessage'
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

// Chart update delay in milliseconds
// This is to prevent the chart from being updated too often
// which can cause flickering in the chart rendering
const CHART_UPDATE_DELAY = 200

const cx = createCx(styles)

interface ChartProps {
  controls: ChartControlState
  selectedClass: CharacterClass
  onPlayerClick: (player: string, timestamp: number) => void
}

function Chart({ selectedClass, controls, onPlayerClick }: ChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS<'line', DataPoint[]> | null>(null)
  const playerColors = useRef<Record<string, string>>({})
  const [chartData, setChartData] = useState<ChartJS | null>(null)
  const { isMobileAndPortrait, isMobileAndLandscape } = useDeviceOrientation()
  const { resetToSpeedruns } = useNavigation()

  // Combine useTransition with debouncing to prevent flickering
  const [isPending, startTransition] = useTransition()
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  const { subclass, difficulty, playerLimit, maxDuration, viewMode, submissionWindow, zoomLevel } =
    controls

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
          showLine: isRecordsView || !isAnonymous,
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
        submissionWindow,
        subclass
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
    [createDatasets, subclass, submissionWindow, maxDuration, playerLimit, selectedClass, viewMode]
  )

  const { speedrunData, isLoading, isLoadingInBackground, isError, lastUpdated, refresh } =
    useSpeedrunData(selectedClass, difficulty)

  useEffect(() => {
    // Clear data and exit if loading
    if (isLoading) {
      setChartData(null)
      return
    }

    // Exit if no chart (canvas) or data
    if (!chartRef.current || !speedrunData) {
      return
    }

    // Clear old timeout to prevent rapid updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    // Schedule debounced transition to prevent flickering
    updateTimeoutRef.current = setTimeout(() => {
      startTransition(() => {
        createChart(speedrunData)
      })
    }, CHART_UPDATE_DELAY)

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [isLoading, speedrunData, createChart, controls, startTransition])

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
    const chartContainerClassName = cx('chart-container', {
      'chart-container--mobilePortraitLoading': isMobilePortraitLoading,
    })
    const chartClassName = cx('chart-container__chart', {
      'chart-container__chart--updating': isPending,
    })

    const hasChartData = chartInstance.current?.data?.datasets?.length

    return (
      <div className={chartContainerClassName}>
        <ClassLoadingMessage
          isVisible={isLoading}
          selectedClass={selectedClass}
          selectedDifficulty={difficulty}
        />
        <ChartErrorMessage
          isVisible={isError && !isLoading}
          selectedClass={selectedClass}
          message="Error loading data!"
        />
        <ChartErrorMessage
          isVisible={!isError && !isLoading && !hasChartData}
          selectedClass={selectedClass}
          message="No runs found for the selected filters!"
          buttonText="Reset filters"
          onClick={() => resetToSpeedruns(selectedClass, difficulty)}
        />
        {!isError && !isLoading && (
          <div
            className={chartClassName}
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

  const onPlayerHover = useCallback(
    (hoveredPlayer: string | null) => {
      if (!chartInstance.current) return

      chartInstance.current.data.datasets.forEach((dataset) => {
        const player = dataset.label || ''
        const isAnonymous = isAnonymousPlayer(player)
        const borderColor = isAnonymous ? anonymousBorderColor : playerColors.current[player]
        const backgroundColor = isAnonymous ? anonymousMarkerColor : playerColors.current[player]
        const isCurrentPlayerHovered = player === hoveredPlayer
        const isAllRunsView = viewMode === ViewMode.All

        dataset.borderWidth = isAllRunsView ? 2 : 3
        dataset.borderDash = isAllRunsView ? [5, 5] : []
        dataset.borderColor = borderColor
        dataset.backgroundColor = backgroundColor

        if (hoveredPlayer) {
          if (isCurrentPlayerHovered) {
            dataset.borderColor = saturate(borderColor, 60)
            dataset.backgroundColor = saturate(backgroundColor, 60)
            dataset.borderDash = []
          } else {
            dataset.borderColor = desaturate(borderColor, 60)
            dataset.backgroundColor = desaturate(backgroundColor, 60)
            dataset.borderWidth = 1
          }
        }
      })

      chartInstance.current.update('none')
    },
    [viewMode]
  )

  return (
    <div className={cx('layout')}>
      <div className={cx('container')} style={{ borderColor }}>
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
        subclass={subclass}
        isLoading={isLoading}
        onPlayerClick={onPlayerClick}
        onPlayerHover={onPlayerHover}
      />
    </div>
  )
}

export default Chart
