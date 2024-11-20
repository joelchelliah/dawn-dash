import { Chart } from 'chart.js'
import moment from 'moment'

const COLOR = '#bbbbbb'

export const yearBoundaries: number[] = []

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

const drawDottedLine = (ctx: CanvasRenderingContext2D, yearLabelOffset: number, chart: Chart) => {
  const bottomOffset = 30

  ctx.save()
  ctx.setLineDash([5, 5])
  ctx.lineWidth = 1
  ctx.strokeStyle = COLOR
  ctx.beginPath()
  ctx.moveTo(yearLabelOffset, chart.chartArea.top)
  ctx.lineTo(yearLabelOffset, chart.chartArea.bottom - bottomOffset)
  ctx.stroke()
  ctx.restore()
}

const drawYearLabel = (
  ctx: CanvasRenderingContext2D,
  yearStart: number,
  yearLabelOffset: number,
  chart: Chart
) => {
  const bottomOffset = 20
  const yearLabel = moment(yearStart).format('YYYY')

  ctx.save()
  ctx.fillStyle = COLOR
  ctx.textAlign = 'center'
  ctx.font = 'bold 12px Arial'
  ctx.fillText(yearLabel, yearLabelOffset, chart.chartArea.bottom - bottomOffset)
  ctx.restore()
}
