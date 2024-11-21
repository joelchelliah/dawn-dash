import { SpeedRunData } from '../types/speedRun'

export function getDurationInMinutes(run: SpeedRunData): number | undefined {
  const durationMatch = run.duration.match(/Duration: (?:\*\*)?(\d{2}):(\d{2}):(\d{2})(?:\*\*)?/)

  if (!durationMatch) return undefined

  const hours = parseInt(durationMatch[1])
  const minutes = parseInt(durationMatch[2])
  const seconds = parseInt(durationMatch[3])

  return hours * 60 + minutes + seconds / 60
}
