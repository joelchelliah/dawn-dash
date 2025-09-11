import { ChartOptions } from 'chart.js'

import { ChartConfig, DataPoint, Dataset } from '../../../types/chart'
import { isAnonymousPlayer } from '../../../utils/players'
import { formatDateAndTime, formatDateShort, formatTime } from '../../../utils/time'

const CHART_COLOR = '#ffffff'
const GRID_COLOR = '#333333'

const MIN_DAYS_BETWEEN_TICKS = 10

/**
 * Chart configuration for the Chart.js instance
 */
export function createChartConfig(
  datasets: Dataset[],
  paddedMinDate: number,
  paddedMaxDate: number,
  paddedMinDuration: number,
  paddedMaxDuration: number
): ChartConfig {
  return {
    type: 'line',
    data: { datasets },
    options: createChartConfigOptions(
      paddedMinDate,
      paddedMaxDate,
      paddedMinDuration,
      paddedMaxDuration
    ),
  }
}

function createChartConfigOptions(
  paddedMinDate: number,
  paddedMaxDate: number,
  paddedMinDuration: number,
  paddedMaxDuration: number
): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 0,

    layout: {
      padding: {
        top: 30,
        bottom: 10,
        left: 10,
      },
    },

    scales: {
      x: {
        type: 'time',
        bounds: 'data',
        min: paddedMinDate,
        max: paddedMaxDate,
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d',
          },
        },
        ticks: {
          color: CHART_COLOR,
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
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
            return formatDateShort(value)
          },
        },
        grid: { color: GRID_COLOR },
      },

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

    plugins: {
      tooltip: {
        mode: 'point',
        intersect: true,

        callbacks: {
          title: (tooltipItems) => {
            if (!tooltipItems.length || !tooltipItems[0].raw) return ''
            const dataPoint = tooltipItems[0].raw as DataPoint

            return formatDateAndTime(dataPoint.x)
          },
          label: (context) => {
            if (!context.raw) return ''
            const dataPoint = context.raw as DataPoint
            const player = context.dataset.label
            const label = isAnonymousPlayer(player ?? '') ? 'Anonymous' : player

            return ` ${label}: ${formatTime(dataPoint.y)}`
          },
        },

        borderColor: '#888',
        borderWidth: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        titleColor: CHART_COLOR,
        bodyColor: CHART_COLOR,
        padding: 12,
        displayColors: true,
      },

      // Using custom legend instead
      legend: { display: false },
    },
  }
}
