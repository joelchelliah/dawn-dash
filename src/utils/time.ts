import moment from 'moment'

import { SpeedRunData } from '../types/speedRun'

export function getDurationInMinutes(run: SpeedRunData): number | undefined {
  const durationMatch = run.duration.match(/Duration: (?:\*\*)?(\d{2}):(\d{2}):(\d{2})(?:\*\*)?/)

  if (!durationMatch) return undefined

  const hours = parseInt(durationMatch[1])
  const minutes = parseInt(durationMatch[2])
  const seconds = parseInt(durationMatch[3])

  return hours * 60 + minutes + seconds / 60
}

export function formatDateAndTime(timestamp: number) {
  return moment(timestamp).format('MMM D, YYYY HH:mm:ss')
}

export function formatTime(time: number) {
  const hours = Math.floor(time / 60)
  const minutes = Math.floor(time % 60)
  const seconds = Math.floor((time * 60) % 60)

  const hoursFormat = `${hours.toString().padStart(2, '0')}:`
  const minutesFormat = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
  return hours > 0 ? `${hoursFormat}${minutesFormat}` : minutesFormat
}
