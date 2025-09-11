import { format } from 'date-fns'

import { SpeedRunData } from '../types/speedRun'

const RUN_DURATION_PATTERN = /Duration: (?:\*\*)?(\d{2}):(\d{2}):(\d{2})(?:\*\*)?/

export function getDurationInMinutes(run: SpeedRunData): number | undefined {
  const durationMatch = run.duration.match(RUN_DURATION_PATTERN)

  if (!durationMatch) return undefined

  const hours = Number(durationMatch[1])
  const minutes = Number(durationMatch[2])
  const seconds = Number(durationMatch[3])

  return hours * 60 + minutes + seconds / 60
}

export function formatDateAndTime(timestamp: number) {
  return format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss')
}

export function formatDateShort(timestamp: string | number) {
  return format(new Date(Number(timestamp)), 'MMM d')
}

export function formatTime(time: number) {
  const totalMinutes = Math.floor(time)
  const seconds = Math.floor((time - totalMinutes) * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours >= 1) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function isWithinLastXDays(timestamp: number, daysString: string) {
  return Date.now() - timestamp <= Number(daysString) * 24 * 60 * 60 * 1000
}
