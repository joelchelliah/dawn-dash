import { DataPoint } from '../types/chart'
import { SpeedRunClass } from '../types/speedRun'

const BASE_HUES = [
  0, // Red
  210, // Blue
  120, // Green
  270, // Purple
  30, // Orange
  180, // Cyan
] as const

const COLOR_VARIANTS = [
  { saturation: 75, lightness: 60 }, // Default variant
  { saturation: 60, lightness: 30 }, // Darker variant
  { saturation: 95, lightness: 75 }, // Brighter variant
] as const

export function getColorMapping(playerMap: Map<string, DataPoint[]>): Record<string, string> {
  return Object.fromEntries(
    Array.from(playerMap.keys()).map((player, i) => [player, getColorByIndex(i)])
  )
}

/**
 * Gets a specific color by index
 * @param index Color index
 * @returns HSL color string
 */
function getColorByIndex(index: number): string {
  const maxBaseColors = BASE_HUES.length * COLOR_VARIANTS.length

  if (index < maxBaseColors) {
    // Use base colors first
    const hueIndex = index % BASE_HUES.length
    const variantIndex = Math.floor(index / BASE_HUES.length) % COLOR_VARIANTS.length
    const hue = BASE_HUES[hueIndex]
    const { saturation, lightness } = COLOR_VARIANTS[variantIndex]

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  } else {
    // Generate intermediate hues
    const intermediateIndex = index - maxBaseColors
    const section = Math.floor(intermediateIndex / (BASE_HUES.length - 1))
    const position = intermediateIndex % (BASE_HUES.length - 1)

    const hue1 = BASE_HUES[position]
    const hue2 = BASE_HUES[position + 1]
    const intermediateHue = hue1 + (hue2 - hue1) / 2

    // Cycle through variants for intermediate hues too
    const variantIndex = section % COLOR_VARIANTS.length
    const { saturation, lightness } = COLOR_VARIANTS[variantIndex]

    return `hsl(${intermediateHue}, ${saturation}%, ${lightness}%)`
  }
}

export function getClassColor(classType: SpeedRunClass, isSelected = false) {
  switch (classType) {
    case SpeedRunClass.Arcanist:
      return isSelected ? '#4d8ae6' : '#3d73cc' // Blue
    case SpeedRunClass.Hunter:
      return isSelected ? '#e69640' : '#cc7f2d' // Orange
    case SpeedRunClass.Knight:
      return isSelected ? '#a65ee6' : '#9454cc' // Purple
    case SpeedRunClass.Rogue:
      return isSelected ? '#47cc47' : '#3db33d' // Green
    case SpeedRunClass.Seeker:
      return isSelected ? '#33cccc' : '#2daaaa' // Teal
    case SpeedRunClass.Warrior:
      return isSelected ? '#e64d4d' : '#cc3d3d' // Red
    default:
      return isSelected ? '#e6bf33' : '#ccaa2d' // Gold
  }
}
