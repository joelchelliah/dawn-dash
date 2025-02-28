import moment from 'moment'

import { SpeedRunClass } from '../../../types/speedRun'

/**
 * Padding the min/max values of the chart axes to prevent clipping of points
 */

const SUNFORGE_DURATION_PADDING = 0.5
const OTHER_DURATION_PADDING = 4

export function padMinDuration(minDuration: number, selectedClass: SpeedRunClass) {
  return selectedClass === SpeedRunClass.Sunforge
    ? Math.max(0, minDuration - SUNFORGE_DURATION_PADDING)
    : Math.max(0, minDuration - OTHER_DURATION_PADDING)
}

export function padMaxDuration(maxDuration: number, selectedClass: SpeedRunClass, ceiling: number) {
  return selectedClass === SpeedRunClass.Sunforge
    ? Math.max(ceiling, maxDuration + SUNFORGE_DURATION_PADDING)
    : Math.max(ceiling, maxDuration + OTHER_DURATION_PADDING)
}

export function padMinMaxDates(dates: number[]) {
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const totalDays = moment(maxDate).diff(moment(minDate), 'days')
  const paddingDays = Math.ceil(totalDays * 0.01)

  return {
    paddedMinDate: moment(minDate).subtract(paddingDays, 'days').valueOf(),
    paddedMaxDate: moment(maxDate).add(paddingDays, 'days').valueOf(),
  }
}
