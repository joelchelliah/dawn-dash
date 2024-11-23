import { Chart } from 'chart.js'
import moment from 'moment'

const YEAR_BOUNDARY_COLOR = '#bbbbbb'
const YEAR_LABEL_OFFSET = 5
const LINE_OFFSET = 20 - YEAR_LABEL_OFFSET

const yearBoundaries: number[] = []

/**
 * Calculates and updates year boundaries based on the date range
 * @param minDate Minimum date in the dataset
 * @param maxDate Maximum date in the dataset
 */
export const calculateYearBoundaries = (minDate: number, maxDate: number): void => {
  // Clear existing year boundaries
  yearBoundaries.length = 0

  // Calculate year boundaries
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

/**
 * Draws a vertical dotted line at the year boundary
 * @param ctx Canvas rendering context
 * @param yearLabelOffset X-coordinate for the line
 * @param chart Chart instance
 */
const drawDottedLine = (ctx: CanvasRenderingContext2D, yearLabelOffset: number, chart: Chart) => {
  ctx.save()
  ctx.setLineDash([5, 5])
  ctx.lineWidth = 1
  ctx.strokeStyle = YEAR_BOUNDARY_COLOR
  ctx.beginPath()
  ctx.moveTo(yearLabelOffset, chart.chartArea.top + LINE_OFFSET) // Start below the label
  ctx.lineTo(yearLabelOffset, chart.chartArea.bottom)
  ctx.stroke()
  ctx.restore()
}

/**
 * Draws the year label above the dotted line
 * @param ctx Canvas rendering context
 * @param yearStart Timestamp for the start of the year
 * @param yearLabelOffset X-coordinate for the label
 * @param chart Chart instance
 */
const drawYearLabel = (
  ctx: CanvasRenderingContext2D,
  yearStart: number,
  yearLabelOffset: number,
  chart: Chart
) => {
  const yearLabel = moment(yearStart).format('YYYY')

  ctx.save()
  ctx.fillStyle = YEAR_BOUNDARY_COLOR
  ctx.textAlign = 'center'
  ctx.font = 'bold 12px Arial'
  ctx.fillText(yearLabel, yearLabelOffset, chart.chartArea.top + YEAR_LABEL_OFFSET)
  ctx.restore()
}
