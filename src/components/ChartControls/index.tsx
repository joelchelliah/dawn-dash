import {
  DIFFICULTY_VALUES,
  GAME_VERSION_LABEL_MAP,
  GAME_VERSION_VALUES,
  MAX_DURATION_OTHER_VALUES,
  MAX_DURATION_SUNFORGE_VALUES,
  PLAYER_LIMIT_VALUES,
  VIEW_MODE_LABELS,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
} from '../../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../../types/chart'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { parseVersion, versionToString } from '../../utils/version'

import ControlGroup from './ControlGroup'
import styles from './index.module.scss'
import ViewModeInfo from './ViewModeInfo'

interface ChartControlsProps {
  controls: ChartControlState
  selectedClass: SpeedRunClass
}

const toDifficultyOption = (value: Difficulty) => ({ value, label: value })

const toPlayerLimitOption = (value: number) => ({ value, label: `${value} players` })

const toMinutesOption = (value: number) => ({ value, label: `${value} minutes` })

const toViewModeOption = (value: ViewMode) => {
  const label = VIEW_MODE_LABELS[value]

  if (!label) throw new Error(`No label found for view mode: ${value}`)

  return { value, label }
}

const toGameVersionOption = (value: string) => {
  const label = GAME_VERSION_LABEL_MAP[value]

  if (!label) throw new Error(`No label found for game version: ${value}`)

  return { value, label }
}

const toZoomLevelOption = (value: number) => ({ value, label: `${value}%` })

function ChartControls({ controls, selectedClass }: ChartControlsProps) {
  const {
    maxDuration,
    setMaxDuration,
    viewMode,
    setViewMode,
    playerLimit,
    setPlayerLimit,
    zoomLevel,
    setZoomLevel,
    difficulty,
    setDifficulty,
    gameVersion,
    setGameVersion,
  } = controls

  const isSunforge = selectedClass === SpeedRunClass.Sunforge

  const darkColor = getClassColor(selectedClass, ClassColorVariant.Dark)

  const controlsBorderStyle = { borderColor: darkColor }

  const getDurationOptions = () =>
    selectedClass === SpeedRunClass.Sunforge
      ? MAX_DURATION_SUNFORGE_VALUES.map(toMinutesOption)
      : MAX_DURATION_OTHER_VALUES.map(toMinutesOption)

  return (
    <>
      <div className={styles.controls} style={controlsBorderStyle}>
        <div className={styles.row}>
          <ControlGroup
            id="difficulty"
            selectedClass={selectedClass}
            label="Difficulty"
            options={DIFFICULTY_VALUES.map(toDifficultyOption)}
            value={difficulty}
            onChange={setDifficulty}
            disabled={isSunforge}
          />

          <ControlGroup
            id="playerLimit"
            selectedClass={selectedClass}
            label="Number of players"
            options={PLAYER_LIMIT_VALUES.map(toPlayerLimitOption)}
            value={playerLimit}
            onChange={setPlayerLimit}
          />

          <ControlGroup
            id="maxDuration"
            selectedClass={selectedClass}
            label="Max duration"
            options={getDurationOptions()}
            value={maxDuration}
            onChange={setMaxDuration}
          />

          <ControlGroup
            id="viewMode"
            selectedClass={selectedClass}
            label="View mode"
            options={VIEW_MODE_VALUES.map(toViewModeOption)}
            value={viewMode}
            onChange={setViewMode}
          />

          <ControlGroup
            id="gameVersion"
            selectedClass={selectedClass}
            label="Earliest version"
            options={GAME_VERSION_VALUES.map(toGameVersionOption)}
            value={versionToString(gameVersion)}
            onChange={(val) => setGameVersion(parseVersion(val))}
          />

          <ControlGroup
            id="zoomLevel"
            selectedClass={selectedClass}
            label="Zoom level"
            options={ZOOM_LEVEL_VALUES.map(toZoomLevelOption)}
            value={zoomLevel}
            onChange={setZoomLevel}
          />
        </div>
      </div>
      <ViewModeInfo viewMode={controls.viewMode} />
    </>
  )
}

export default ChartControls
