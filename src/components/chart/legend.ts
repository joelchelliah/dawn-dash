import { Chart as ChartJS } from 'chart.js'

// Types
interface LegendItem {
  label: string
  color: string
  bestTime: number
}

/**
 * Creates a custom legend for the chart
 * Could be split into:
 * - legendData.ts (data processing)
 * - legendDOM.ts (DOM creation)
 * - legendStyles.ts (styling)
 */
export const createLegend = (chart: ChartJS) => {
  const legendContainer = document.getElementById('legend-container')
  if (!legendContainer) return

  // Clear existing legend
  legendContainer.innerHTML = ''

  // Process chart data into legend items
  // Could be moved to legendData.ts
  const legendItems: LegendItem[] = chart.data.datasets.map((dataset) => {
    const data = dataset.data as { y: number }[]
    const bestTime = Math.min(...data.map((point) => point.y))

    return {
      label: dataset.label || '',
      color: dataset.borderColor as string,
      bestTime,
    }
  })

  // Sort items by best time
  legendItems.sort((a, b) => a.bestTime - b.bestTime)

  // Create DOM elements
  // Could be moved to legendDOM.ts
  const ul = document.createElement('ul')
  ul.style.listStyle = 'none'
  ul.style.padding = '0'
  ul.style.margin = '0'

  // Create legend items
  legendItems.forEach((item) => {
    // Create and style list item elements
    // Could be moved to legendStyles.ts
    const li = document.createElement('li')
    li.style.marginBottom = '10px'
    li.style.display = 'flex'
    li.style.alignItems = 'center'

    // Color box
    const colorBox = document.createElement('span')
    colorBox.style.display = 'inline-block'
    colorBox.style.width = '15px'
    colorBox.style.height = '15px'
    colorBox.style.marginRight = '10px'
    colorBox.style.backgroundColor = item.color

    // Player name
    const nameSpan = document.createElement('span')
    nameSpan.style.fontWeight = 'bold'
    nameSpan.textContent = item.label

    // Best time
    const timeSpan = document.createElement('span')
    timeSpan.style.fontStyle = 'italic'
    timeSpan.style.marginLeft = '5px'

    // Format time string
    // Could be moved to formatters.ts
    const hours = Math.floor(item.bestTime / 60)
    const minutes = Math.floor(item.bestTime % 60)
    const seconds = Math.floor((item.bestTime * 60) % 60)

    const simpleTimeString = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
    const timeString =
      hours > 0
        ? `- ${hours.toString().padStart(2, '0')}:${simpleTimeString}`
        : `- ${simpleTimeString}`

    timeSpan.textContent = timeString

    // Append elements
    li.appendChild(colorBox)
    li.appendChild(nameSpan)
    li.appendChild(timeSpan)
    ul.appendChild(li)
  })

  legendContainer.appendChild(ul)
}
