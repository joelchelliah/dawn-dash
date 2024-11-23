import { ChartOptions } from 'chart.js'
import moment from 'moment'

import { DataPoint, ViewMode } from '../../types/chart'
import { formatDateAndTime, formatTime } from '../../utils/time'

const CHART_COLOR = '#ffffff'
const GRID_COLOR = '#333333'

const MIN_DAYS_BETWEEN_TICKS = 10

/**
 * Creates the configuration object for the Chart.js instance
 * Could be split into:
 * - scales.ts (x and y axis configuration)
 * - tooltips.ts (tooltip behavior and formatting)
 * - theme.ts (colors and visual settings)
 */
export const createChartConfig = (
  paddedMinDate: number,
  paddedMaxDate: number,
  paddedMinDuration: number,
  paddedMaxDuration: number,
  viewMode: ViewMode,
  allRecordPoints: Array<{ player: string; run: DataPoint }>
): ChartOptions => ({
  // Basic chart configuration
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'nearest',
  },

  // Layout hooks
  layout: {
    padding: {
      top: 30,
      bottom: 10,
      left: 10,
    },
  },

  // Axis scales configuration
  scales: {
    x: {
      type: 'time',
      bounds: 'data',
      min: paddedMinDate,
      max: paddedMaxDate,
      time: {
        unit: 'day',
        displayFormats: {
          day: 'MMM D',
        },
      },
      ticks: {
        color: CHART_COLOR,
        maxRotation: 45,
        minRotation: 45,
        autoSkip: true,
        maxTicksLimit: 100,
        source: 'data',
        callback: function (value, index, ticks) {
          // Skip if too close to previous tick
          if (index > 0) {
            const prevTick = ticks[index - 1]
            const currentValue = Number(value)
            const prevValue = Number(prevTick.value)
            const diff = currentValue - prevValue

            if (diff < 1000 * 60 * 60 * 24 * MIN_DAYS_BETWEEN_TICKS) {
              return ''
            }
          }
          return moment(value).format('MMM D')
        },
      },
      grid: { color: GRID_COLOR },
    },

    // Y-axis (duration) configuration
    y: {
      min: paddedMinDuration,
      max: Math.min(paddedMaxDuration, 1500),
      afterBuildTicks: (axis) => {
        axis.ticks.shift()
        axis.ticks.pop()
      },
      ticks: {
        color: CHART_COLOR,
        callback: (val: string | number) => val && formatTime(Number(val)),
      },
      grid: { color: GRID_COLOR },
      title: { display: false },
    },
  },

  // Plugin configurations
  plugins: {
    tooltip: {
      // Filter tooltip visibility based on view mode
      filter: function (tooltipItem) {
        if (!tooltipItem.raw) return false
        const dataPoint = tooltipItem.raw as DataPoint
        if (viewMode === 'records') {
          return allRecordPoints.some(
            (record) =>
              record.run.x === dataPoint.x &&
              record.run.y === dataPoint.y &&
              record.player === tooltipItem.dataset.label
          )
        }
        return true
      },
      mode: 'point',
      intersect: true,

      // Tooltip content formatting
      callbacks: {
        title: (tooltipItems) => {
          if (!tooltipItems.length || !tooltipItems[0].raw) return ''
          const dataPoint = tooltipItems[0].raw as DataPoint

          return formatDateAndTime(dataPoint.x)
        },
        label: (context) => {
          if (!context.raw) return ''
          const dataPoint = context.raw as DataPoint

          return `${context.dataset.label}: ${formatTime(dataPoint.y)}`
        },
      },

      // Tooltip visual styling
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: CHART_COLOR,
      bodyColor: CHART_COLOR,
      padding: 10,
      displayColors: true,
    },

    // Using custom legend instead
    legend: {
      display: false,
    },
  },
})
