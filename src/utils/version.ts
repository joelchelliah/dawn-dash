import { GAME_VERSION_VALUES } from '../constants/chartControlValues'
import { GameVersionRange, SubmissionWindow } from '../types/chart'
import { GameVersion } from '../types/speedRun'

export function parseVersion(version: string): GameVersion {
  const [major, minor, patch = 0] = version.split('.').map(Number)

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`Invalid version format: ${version}`)
  }

  return { major, minor, patch }
}

export function isVersionEqualOrAfter(version: GameVersion, target?: GameVersion): boolean {
  if (!target) return true

  const { major, minor } = version
  const { major: targetMajor, minor: targetMinor } = target

  return major > targetMajor || (major === targetMajor && minor >= targetMinor)
}

export function isVersionEqualOrBefore(version: GameVersion, target?: GameVersion): boolean {
  if (!target) return true

  const { major, minor } = version
  const { major: targetMajor, minor: targetMinor } = target

  return major < targetMajor || (major === targetMajor && minor <= targetMinor)
}

export function versionToString(version: GameVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`
}

export function isGameVersionRange(window: SubmissionWindow): window is GameVersionRange {
  return typeof window === 'object' && 'min' in window && 'max' in window
}

export function isAllGameVersions(window: GameVersionRange): boolean {
  return (
    window.min === GAME_VERSION_VALUES[0] &&
    window.max === GAME_VERSION_VALUES[GAME_VERSION_VALUES.length - 1]
  )
}

export function isSingleGameVersion(window: GameVersionRange): boolean {
  return window.min === window.max
}

export function isLastXDays(window: SubmissionWindow): window is string {
  return typeof window === 'string'
}

export function submissionWindowToUrlString(window: SubmissionWindow): string {
  return isGameVersionRange(window) ? `${window.min}-${window.max}` : window
}

export function submissionWindowFromUrlString(window: string): SubmissionWindow {
  if (!window.includes('-')) return window

  const [min, max] = window.split('-')

  return { min, max }
}
