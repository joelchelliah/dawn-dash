import { GameVersion } from '../types/speedRun'

export function parseVersion(version: string): GameVersion {
  const [major, minor, patch] = version.split('.').map(Number)

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`Invalid version format: ${version}`)
  }

  return { major, minor, patch }
}

export function isVersionAfter(version: GameVersion, target: GameVersion): boolean {
  const { major, minor, patch } = version
  const { major: targetMajor, minor: targetMinor, patch: targetPatch } = target

  return (
    major > targetMajor ||
    (major === targetMajor && minor > targetMinor) ||
    (major === targetMajor && minor === targetMinor && patch > targetPatch)
  )
}

export function versionToString(version: GameVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`
}
