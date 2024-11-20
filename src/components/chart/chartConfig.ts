import { ChartOptions } from 'chart.js'
import moment from 'moment'

const CHART_COLOR = '#ffffff'
const GRID_COLOR = '#333333'

export const createChartConfig = (
  paddedMinDate: number,
  paddedMaxDate: number,
  paddedMinDuration: number,
  paddedMaxDuration: number
): ChartOptions => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'nearest',
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
  plugins: {
    tooltip: {
      callbacks: {
        title: (tooltipItems) => {
          return moment(tooltipItems[0].parsed.x).format('MMM D, YYYY HH:mm:ss')
        },
        label: (context) => {
          const value = context.parsed.y
          if (value === undefined) return ''
          const hours = Math.floor(value / 60)
          const minutes = Math.floor(value % 60)
          const seconds = Math.floor((value * 60) % 60)
          return `${context.dataset.label}: ${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        },
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: CHART_COLOR,
      bodyColor: CHART_COLOR,
      padding: 10,
      displayColors: true,
    },
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
