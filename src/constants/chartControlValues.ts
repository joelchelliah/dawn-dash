import { ViewMode } from '../types/chart'

export const ALL_VALUE = 'All'

export const PLAYER_LIMIT_DEFAULT = 30
export const PLAYER_LIMIT_VALUES = [3, 5, 10, 20, 30, ALL_VALUE]

export const MAX_DURATION_SCION_DEFAULT = 21
export const MAX_DURATION_SCION_VALUES = [12, 15, 21, 30, ALL_VALUE]

export const MAX_DURATION_OTHER_DEFAULT = 120
export const MAX_DURATION_OTHER_VALUES = [60, 90, 120, 240, ALL_VALUE]

export const VIEW_MODE_DEFAULT = ViewMode.Improvements
export const VIEW_MODE_VALUES = [ViewMode.Improvements, ViewMode.Records]

export const ZOOM_LEVEL_DEFAULT = 100
export const ZOOM_LEVEL_VALUES = [100, 200, 300, 400]
