import tinycolor from 'tinycolor2'

import { CharacterClass } from '../types/characterClass'

const CLASS_COLORS = {
  [CharacterClass.Arcanist]: '#2973b5', // Blue
  [CharacterClass.Hunter]: '#b4562c', // Orange
  [CharacterClass.Knight]: '#6d53ad', // Purple
  [CharacterClass.Rogue]: '#60984a', // Green
  [CharacterClass.Seeker]: '#2f9c83', // Teal
  [CharacterClass.Warrior]: '#b52121', // Red
  [CharacterClass.Sunforge]: '#b58d28', // Gold
  [CharacterClass.Neutral]: '#BBB', // Grey
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
  classType: CharacterClass,
  variant: ClassColorVariant = ClassColorVariant.Default
) {
  const color = CLASS_COLORS[classType]

  return shadeColorByVariant(color, variant)
}

export function shadeColorByVariant(color: string, variant: ClassColorVariant): string {
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
