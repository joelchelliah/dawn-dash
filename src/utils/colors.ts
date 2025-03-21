import tinycolor from 'tinycolor2'

import { DataPoint } from '../types/chart'
import { SpeedRunClass, SpeedRunSubclass } from '../types/speedRun'

export const anonymousMarkerColor = '#111'
export const anonymousBorderColor = '#777'
export const anonymousBorderHoverColor = '#999'

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

const CLASS_COLORS = {
  [SpeedRunClass.Arcanist]: '#2973b5', // Blue
  [SpeedRunClass.Hunter]: '#b4562c', // Orange
  [SpeedRunClass.Knight]: '#6d53ad', // Purple
  [SpeedRunClass.Rogue]: '#60984a', // Green
  [SpeedRunClass.Seeker]: '#2f9c83', // Teal
  [SpeedRunClass.Warrior]: '#b52121', // Red
  [SpeedRunClass.Sunforge]: '#b58d28', // Gold
}

const SUBCLASS_COLORS = {
  [SpeedRunSubclass.Arcanist]: '#2973b5', // Blue
  [SpeedRunSubclass.Hunter]: '#b4562c', // Orange
  [SpeedRunSubclass.Knight]: '#6d53ad', // Purple
  [SpeedRunSubclass.Rogue]: '#60984a', // Green
  [SpeedRunSubclass.Seeker]: '#2f9c83', // Teal
  [SpeedRunSubclass.Warrior]: '#b52121', // Red
  [SpeedRunSubclass.All]: '#b58d28', // Gold
  [SpeedRunSubclass.Hybrid]: '#BBB', // Grey
}

export enum ClassColorVariant {
  ControlText,
  Lighter,
  Light,
  Default,
  Dark,
  Darker,
  Darkest,
}

export function getClassColor(
  classType: SpeedRunClass,
  variant: ClassColorVariant = ClassColorVariant.Default
) {
  const color = CLASS_COLORS[classType]

  return shadeColorByVariant(color, variant)
}

export function getSubclassColor(subclass: SpeedRunSubclass, isActive: boolean) {
  const color = SUBCLASS_COLORS[subclass]
  const isLightShadedColor = [
    SpeedRunSubclass.Hybrid,
    SpeedRunSubclass.Rogue,
    SpeedRunSubclass.Seeker,
    SpeedRunSubclass.All,
  ].includes(subclass)
  const variant = isActive
    ? ClassColorVariant.Light
    : isLightShadedColor
      ? ClassColorVariant.Dark
      : ClassColorVariant.Default

  return shadeColorByVariant(color, variant)
}

export function lighten(color: string, percent: number): string {
  return tinycolor(color)
    .brighten(percent)
    .saturate(percent / 6)
    .toString()
}

export function darken(color: string, percent: number): string {
  return tinycolor(color)
    .darken(percent)
    .desaturate(percent / 2)
    .toString()
}

export function saturate(color: string, percent: number): string {
  return tinycolor(color)
    .lighten(percent / 10)
    .saturate(percent)
    .toString()
}

export function desaturate(color: string, percent: number): string {
  return tinycolor(color)
    .darken(percent / 10)
    .setAlpha((100 - percent) / 100)
    .desaturate(percent)
    .toString()
}

function shadeColorByVariant(color: string, variant: ClassColorVariant): string {
  switch (variant) {
    case ClassColorVariant.ControlText:
      return lighten(color, 45)
    case ClassColorVariant.Lighter:
      return lighten(color, 15)
    case ClassColorVariant.Light:
      return lighten(color, 5)
    case ClassColorVariant.Dark:
      return darken(color, 10)
    case ClassColorVariant.Darker:
      return darken(color, 15)
    case ClassColorVariant.Darkest:
      return darken(color, 20)
    default:
      return color
  }
}
