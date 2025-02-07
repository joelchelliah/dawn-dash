import { ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass, SpeedRunSubclass } from '../types/speedRun'

export const CLASS_DEFAULT = SpeedRunClass.Arcanist
export const SUBCLASS_DEFAULT = SpeedRunSubclass.All

export const DIFFICULTY_DEFAULT = Difficulty.Impossible
export const DIFFICULTY_VALUES = Object.values(Difficulty)

export const PLAYER_LIMIT_DEFAULT = 30
export const PLAYER_LIMIT_VALUES = [3, 5, 10, 20, 30]

export const MAX_DURATION_SUNFORGE_DEFAULT = 30
export const MAX_DURATION_SUNFORGE_VALUES = [12, 15, 21, 30, 120]

export const MAX_DURATION_OTHER_DEFAULT = 240
export const MAX_DURATION_OTHER_VALUES = [60, 90, 120, 240]

export const VIEW_MODE_DEFAULT = ViewMode.Improvements
export const VIEW_MODE_SUNFORGE_DEFAULT = ViewMode.All
export const VIEW_MODE_VALUES = [ViewMode.All, ViewMode.Improvements, ViewMode.Records]
export const VIEW_MODE_LABELS = {
  [ViewMode.All]: 'All runs',
  [ViewMode.Improvements]: 'Self-improving runs',
  [ViewMode.Records]: 'Record-breaking runs',
}

export const GAME_VERSION_VALUES = [
  '1.5', // Earliest available version?
  '1.6', // Infinitum
  '1.7', // Trials of the Sunforge
  '1.8', // Mask of Misery
  '1.9', // Onyx Cathedral
  '1.10', // Catalyst
  '1.11', // Meta Progression
  '1.12', // Siege of Shadows
  '1.13', // Thornwind Pass
  '1.14', // Eclypse
]
export const LAST_DAYS_VALUES = ['120', '90', '60', '30']

export const SUBMISSION_WINDOW_DEFAULT = { min: '1.5', max: '1.14' }
export const SUBMISSION_WINDOW_VALUES = [...GAME_VERSION_VALUES, ...LAST_DAYS_VALUES]
export const SUBMISSION_WINDOW_LABEL_MAP: Record<string, string> = {
  '1.5': '1.5 (Earliest available)',
  '1.6': '1.6 (Infinitum)',
  '1.7': '1.7 (Trials of the Sunforge)',
  '1.8': '1.8 (Mask of Misery)',
  '1.9': '1.9 (Onyx Cathedral)',
  '1.10': '1.10 (Catalyst)',
  '1.11': '1.11 (Meta Progression)',
  '1.12': '1.12 (Siege of Shadows)',
  '1.13': '1.13 (Thornwind Pass)',
  '1.14': '1.14 (Eclypse)',
  '120': 'Last 120 days',
  '90': 'Last 90 days',
  '60': 'Last 60 days',
  '30': 'Last 30 days',
}

export const ZOOM_LEVEL_DEFAULT = 100
export const ZOOM_LEVEL_VALUES = [100, 200, 300, 400]
