import { Chart } from 'chart.js'
import moment from 'moment'

const YEAR_BOUNDARY_COLOR = '#999999'
const YEAR_LABEL_FONT = 'bold 12px Arial'
const YEAR_LABEL_OFFSET = 0
const LINE_OFFSET = 15 - YEAR_LABEL_OFFSET

const yearBoundaries: number[] = []

/**
 * Calculates and updates year boundaries based on the date range
 * @param minDate Minimum date in the dataset
 * @param maxDate Maximum date in the dataset
 */
export const calculateYearBoundaries = (minDate: number, maxDate: number): void => {
  // Clear existing year boundaries
  yearBoundaries.length = 0

  let currentYear = moment(minDate).year()
  const endYear = moment(maxDate).year()

  while (currentYear <= endYear) {
    const yearStart = moment(`${currentYear}-01-01`).startOf('day').valueOf()
    if (yearStart >= minDate && yearStart <= maxDate) {
      yearBoundaries.push(yearStart)
    }
    currentYear++
  }
}

/**
 * Chart.js plugin that draws year boundary indicators before the chart is rendered
 * Adds vertical dotted lines and year labels at the start of each year
 */
export const yearBoundariesPlugin = {
  id: 'yearBoundaries',
  beforeDraw: (chart: Chart) => {
    const { ctx } = chart
    const xScale = chart.scales['x']

    yearBoundaries.forEach((yearStart) => {
      const yearLabelOffset = xScale.getPixelForValue(yearStart)

      drawDottedLine(ctx, yearLabelOffset, chart)
      drawYearLabel(ctx, yearStart, yearLabelOffset, chart)
    })
  },
}

const drawDottedLine = (ctx: CanvasRenderingContext2D, x: number, chart: Chart) => {
  ctx.save()
  ctx.setLineDash([5, 10])
  ctx.lineWidth = 1
  ctx.strokeStyle = YEAR_BOUNDARY_COLOR
  ctx.beginPath()
  ctx.moveTo(x, chart.chartArea.top + LINE_OFFSET)
  ctx.lineTo(x, chart.chartArea.bottom)
  ctx.stroke()
  ctx.restore()
}

const drawYearLabel = (
  ctx: CanvasRenderingContext2D,
  yearStart: number,
  x: number,
  chart: Chart
) => {
  const yearLabel = moment(yearStart).format('YYYY')

  ctx.save()
  ctx.fillStyle = YEAR_BOUNDARY_COLOR
  ctx.textAlign = 'center'
  ctx.font = YEAR_LABEL_FONT
  ctx.fillText(yearLabel, x, chart.chartArea.top + YEAR_LABEL_OFFSET)
  ctx.restore()
}
