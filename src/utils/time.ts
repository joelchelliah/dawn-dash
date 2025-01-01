import moment from 'moment'

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
  return moment(timestamp).format('MMM D, YYYY HH:mm:ss')
}

export function formatDateShort(timestamp: string | number) {
  return moment(timestamp).format('MMM D')
}

export function formatTime(time: number) {
  const duration = moment.duration(time, 'minutes')
  const format = duration.asHours() >= 1 ? 'HH:mm:ss' : 'mm:ss'
  return moment.utc(duration.asMilliseconds()).format(format)
}

export function isWithinLastXDays(timestamp: number, daysString: string) {
  return Date.now() - timestamp <= Number(daysString) * 24 * 60 * 60 * 1000
}
