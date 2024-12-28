import { ViewMode } from '../types/chart'
import { Difficulty, SpeedRunClass } from '../types/speedRun'

export const CLASS_DEFAULT = SpeedRunClass.Arcanist

export const DIFFICULTY_DEFAULT = Difficulty.Impossible
export const DIFFICULTY_VALUES = Object.values(Difficulty)

export const PLAYER_LIMIT_DEFAULT = 30
export const PLAYER_LIMIT_VALUES = [3, 5, 10, 20, 30]

export const MAX_DURATION_SUNFORGE_DEFAULT = 30
export const MAX_DURATION_SUNFORGE_VALUES = [12, 15, 21, 30]

export const MAX_DURATION_OTHER_DEFAULT = 240
export const MAX_DURATION_OTHER_VALUES = [60, 90, 120, 240]

export const VIEW_MODE_DEFAULT = ViewMode.Improvements
export const VIEW_MODE_VALUES = [ViewMode.All, ViewMode.Improvements, ViewMode.Records]
export const VIEW_MODE_LABELS = {
  [ViewMode.All]: 'All runs',
  [ViewMode.Improvements]: 'Self-improving runs',
  [ViewMode.Records]: 'Record-breaking runs',
}

export const GAME_VERSION_DEFAULT = '1.5.0'
export const GAME_VERSION_VALUES = [
  '1.5.0', // Earliest available version?
  '1.6.0', // Infinitum
  '1.7.0', // Trials of the Sunforge
  '1.8.0', // Mask of Misery
  '1.9.0', // Onyx Cathedral
  '1.10.0', // Catalyst
  '1.11.0', // Meta Progression
  '1.12.0', // Siege of Shadows
  '1.13.0', // Thornwind Pass
  '1.14.0', // Eclypse
]
export const GAME_VERSION_LABEL_MAP: Record<string, string> = {
  '1.5.0': 'Earliest available (1.5)',
  '1.6.0': 'Infinitum (1.6)',
  '1.7.0': 'Trials of the Sunforge (1.7)',
  '1.8.0': 'Mask of Misery (1.8)',
  '1.9.0': 'Onyx Cathedral (1.9)',
  '1.10.0': 'Catalyst (1.10)',
  '1.11.0': 'Meta Progression (1.11)',
  '1.12.0': 'Siege of Shadows (1.12)',
  '1.13.0': 'Thornwind Pass (1.13)',
  '1.14.0': 'Eclypse (1.14)',
}

export const ZOOM_LEVEL_DEFAULT = 100
export const ZOOM_LEVEL_VALUES = [100, 200, 300, 400]
