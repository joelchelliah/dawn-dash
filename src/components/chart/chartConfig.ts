import { ChartOptions } from 'chart.js'
import moment from 'moment'

import { DataPoint } from '../../types/chart'

// Chart theme constants
const CHART_COLOR = '#ffffff'
const GRID_COLOR = '#333333'

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
  viewMode: 'all' | 'records',
  allRecordPoints: Array<{ player: string; run: DataPoint }>
): ChartOptions => ({
  // Basic chart configuration
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'nearest',
  },

  // Axis scales configuration
  // Could be moved to scales.ts
  scales: {
    // X-axis (time) configuration
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
        maxTicksLimit: 15,
        source: 'data',
        autoSkipPadding: 100,
      },
      grid: {
        color: GRID_COLOR,
      },
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
        callback: (tickValue: string | number) => {
          // Duration formatting logic
          // Could be moved to formatters.ts
          if (tickValue === undefined) return ''
          const value = Number(tickValue)
          const hours = Math.floor(value / 60)
          const minutes = Math.floor(value % 60)
          const seconds = Math.floor((value * 60) % 60)
          return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        },
      },
      grid: {
        color: GRID_COLOR,
      },
      title: {
        display: true,
        text: 'Run duration',
        color: CHART_COLOR,
      },
    },
  },

  // Plugin configurations
  plugins: {
    // Tooltip configuration
    // Could be moved to tooltips.ts
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
          // Timestamp formatting
          if (!tooltipItems.length || !tooltipItems[0].raw) return ''
          const dataPoint = tooltipItems[0].raw as DataPoint
          return moment(dataPoint.x).format('MMM D, YYYY HH:mm:ss')
        },
        label: (context) => {
          // Duration formatting
          if (!context.raw) return ''
          const dataPoint = context.raw as DataPoint
          const value = dataPoint.y
          const hours = Math.floor(value / 60)
          const minutes = Math.floor(value % 60)
          const seconds = Math.floor((value * 60) % 60)
          return `${context.dataset.label}: ${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        },
      },

      // Tooltip visual styling
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: CHART_COLOR,
      bodyColor: CHART_COLOR,
      padding: 10,
      displayColors: true,
    },

    // Legend configuration
    // Note: Custom legend is created in legend.ts
    legend: {
      position: 'right' as const,
      align: 'start' as const,
      labels: {
        color: CHART_COLOR,
        padding: 20,
        boxWidth: 15,
      },
      display: false,
    },
  },
})
