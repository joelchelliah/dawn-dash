import { useState } from 'react'

import {
  DIFFICULTY_VALUES,
  MAX_DURATION_OTHER_VALUES,
  MAX_DURATION_SUNFORGE_VALUES,
  PLAYER_LIMIT_VALUES,
  SUBMISSION_WINDOW_LABEL_MAP,
  VIEW_MODE_LABELS,
  VIEW_MODE_VALUES,
  ZOOM_LEVEL_VALUES,
} from '../../constants/chartControlValues'
import { ChartControlState, ViewMode } from '../../types/chart'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { isAllGameVersions, isGameVersionRange, isSingleGameVersion } from '../../utils/version'

import ControlGroup from './ControlGroup'
import styles from './index.module.scss'
import SubmissionWindowModal from './SubmissionWindowControlModal'
import ViewModeModal from './ViewModeControlModal'

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
    submissionWindow,
    setSubmissionWindow,
  } = controls

  const isSunforge = selectedClass === SpeedRunClass.Sunforge

  const darkColor = getClassColor(selectedClass, ClassColorVariant.Darker)

  const controlsBorderStyle = { borderColor: darkColor }

  const getDurationOptions = () =>
    selectedClass === SpeedRunClass.Sunforge
      ? MAX_DURATION_SUNFORGE_VALUES.map(toMinutesOption)
      : MAX_DURATION_OTHER_VALUES.map(toMinutesOption)

  const getSubmissionWindowOption = () => {
    const value = submissionWindow
    if (isGameVersionRange(value)) {
      if (isAllGameVersions(value)) {
        return { value, label: 'All versions' }
      }

      if (isSingleGameVersion(value)) {
        return { value, label: `Version: ${SUBMISSION_WINDOW_LABEL_MAP[value.min]}` }
      }

      return { value, label: `Versions: ${value.min} - ${value.max}` }
    }

    return { value, label: SUBMISSION_WINDOW_LABEL_MAP[value] }
  }

  const [isViewModeModalOpen, setIsViewModeModalOpen] = useState(false)
  const [isSubmissionWindowModalOpen, setIsSubmissionWindowModalOpen] = useState(false)
  return (
    <>
      <div className={styles['controls']} style={controlsBorderStyle}>
        <div className={styles['row']}>
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
            onClick={() => setIsViewModeModalOpen(true)}
          />

          <ControlGroup
            id="submissionWindow"
            selectedClass={selectedClass}
            label="Runs from"
            options={[getSubmissionWindowOption()]}
            value={submissionWindow}
            onClick={() => setIsSubmissionWindowModalOpen(true)}
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

      <ViewModeModal
        isOpen={isViewModeModalOpen}
        onClose={() => setIsViewModeModalOpen(false)}
        onApply={setViewMode}
        selectedClass={selectedClass}
        currentViewMode={viewMode}
      />

      <SubmissionWindowModal
        isOpen={isSubmissionWindowModalOpen}
        onClose={() => setIsSubmissionWindowModalOpen(false)}
        onApply={setSubmissionWindow}
        selectedClass={selectedClass}
        currentSubmissionWindow={submissionWindow}
      />
    </>
  )
}

export default ChartControls
