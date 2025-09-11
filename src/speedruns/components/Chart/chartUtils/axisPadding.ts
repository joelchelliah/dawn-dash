import { differenceInDays, subDays, addDays } from 'date-fns'

import { CharacterClass } from '@/shared/types/characterClass'

/**
 * Padding the min/max values of the chart axes to prevent clipping of points
 */

const SUNFORGE_DURATION_PADDING = 0.5
const OTHER_DURATION_PADDING = 4

export function padMinDuration(minDuration: number, selectedClass: CharacterClass) {
  return selectedClass === CharacterClass.Sunforge
    ? Math.max(0, minDuration - SUNFORGE_DURATION_PADDING)
    : Math.max(0, minDuration - OTHER_DURATION_PADDING)
}

export function padMaxDuration(
  maxDuration: number,
  selectedClass: CharacterClass,
  ceiling: number
) {
  return selectedClass === CharacterClass.Sunforge
    ? Math.max(ceiling, maxDuration + SUNFORGE_DURATION_PADDING)
    : Math.max(ceiling, maxDuration + OTHER_DURATION_PADDING)
}

export function padMinMaxDates(dates: number[]) {
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const totalDays = differenceInDays(new Date(maxDate), new Date(minDate))
  const paddingDays = Math.ceil(totalDays * 0.01)

  return {
    paddedMinDate: subDays(new Date(minDate), paddingDays).getTime(),
    paddedMaxDate: addDays(new Date(maxDate), paddingDays).getTime(),
  }
}
