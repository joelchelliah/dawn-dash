import { useEffect, useState } from 'react'

import {
  GAME_VERSION_VALUES,
  LAST_DAYS_VALUES,
  SUBMISSION_WINDOW_LABEL_MAP,
} from '../../../constants/chartControlValues'
import { SubmissionWindow } from '../../../types/chart'
import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import { isGameVersionRange, isLastXDays } from '../../../utils/version'
import Button from '../../Buttons/Button'
import ButtonRow from '../../Buttons/ButtonRow'
import PrimaryButton from '../../Buttons/PrimaryButton'
import Modal from '../../Modals/Modal'
import ControlRadioButton from '../ControlRadioButton'

import styles from './index.module.scss'
import NumberOfDaysSlider from './NumberOfDaysSlider'
import VersionRangeSlider from './VersionRangeSlider'

interface SubmissionWindowModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (submissionWindow: SubmissionWindow) => void
  selectedClass: SpeedRunClass
  currentSubmissionWindow: SubmissionWindow
}

enum SubmissionWindowMode {
  MinMaxVersion = 'MinMaxVersion',
  LastXDays = 'LastXDays',
}

function SubmissionWindowModal({
  isOpen,
  onClose,
  onApply,
  selectedClass,
  currentSubmissionWindow,
}: SubmissionWindowModalProps) {
  const isVersionRange = isGameVersionRange(currentSubmissionWindow)
  const isLeague = isLastXDays(currentSubmissionWindow)
  const [selectedWindowMode, setSelectedWindowMode] = useState(
    isVersionRange ? SubmissionWindowMode.MinMaxVersion : SubmissionWindowMode.LastXDays
  )
  const [minVersion, setMinVersion] = useState(
    isVersionRange ? currentSubmissionWindow.min : GAME_VERSION_VALUES[0]
  )
  const [maxVersion, setMaxVersion] = useState(
    isVersionRange
      ? currentSubmissionWindow.max
      : GAME_VERSION_VALUES[GAME_VERSION_VALUES.length - 1]
  )
  const [lastXDays, setLastXDays] = useState(
    isLeague ? currentSubmissionWindow : LAST_DAYS_VALUES[0]
  )

  useEffect(() => {
    if (isVersionRange) {
      setSelectedWindowMode(SubmissionWindowMode.MinMaxVersion)
      setMinVersion(currentSubmissionWindow.min)
      setMaxVersion(currentSubmissionWindow.max)
      setLastXDays(LAST_DAYS_VALUES[0])
    } else {
      setSelectedWindowMode(SubmissionWindowMode.LastXDays)
      setMinVersion(GAME_VERSION_VALUES[0])
      setMaxVersion(GAME_VERSION_VALUES[GAME_VERSION_VALUES.length - 1])
      setLastXDays(currentSubmissionWindow)
    }
  }, [currentSubmissionWindow, isOpen, isVersionRange])

  if (!isOpen) return null

  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkColor = getClassColor(selectedClass, ClassColorVariant.Dark)
  const lighterColor = getClassColor(selectedClass, ClassColorVariant.Lighter)

  const headerStyle = {
    color: defaultColor,
    borderColor: darkColor,
  } as React.CSSProperties

  const handleVersionChange = ([min, max]: [string, string]) => {
    setMinVersion(min)
    setMaxVersion(max)
  }

  const handleApply = () => {
    if (selectedWindowMode === SubmissionWindowMode.MinMaxVersion) {
      onApply({ min: minVersion, max: maxVersion })
    } else {
      onApply(lastXDays)
    }
    onClose()
  }

  const renderMinMaxVersionsNamed = () => {
    const min = SUBMISSION_WINDOW_LABEL_MAP[minVersion]
    const max = SUBMISSION_WINDOW_LABEL_MAP[maxVersion]

    return (
      <span>
        Only show runs submitted between <strong>{min}</strong> and <strong>{max}</strong>
      </span>
    )
  }

  const renderLastXDays = () => {
    return (
      <span>
        Only show runs submittend in the last <strong>{lastXDays}</strong> days
      </span>
    )
  }

  const labelTitleSelectedStyle = {
    color: lighterColor,
  } as React.CSSProperties

  return (
    <Modal isOpen={isOpen} onClose={onClose} selectedClass={selectedClass} maxWidth={800}>
      <div className={styles['container']}>
        <h3 style={headerStyle}>Submission Window</h3>

        <ControlRadioButton
          value={selectedWindowMode}
          name="versionRange"
          selectedClass={selectedClass}
          isSelected={selectedWindowMode === SubmissionWindowMode.MinMaxVersion}
          onChange={() => setSelectedWindowMode(SubmissionWindowMode.MinMaxVersion)}
        >
          <span
            className={styles['option-title']}
            style={
              selectedWindowMode === SubmissionWindowMode.MinMaxVersion
                ? labelTitleSelectedStyle
                : {}
            }
          >
            Game versions:
          </span>
          <span className={styles['option-description']}>{renderMinMaxVersionsNamed()}</span>
          <VersionRangeSlider
            selectedClass={selectedClass}
            minVersion={minVersion}
            maxVersion={maxVersion}
            onChange={handleVersionChange}
            onPointerDown={() => setSelectedWindowMode(SubmissionWindowMode.MinMaxVersion)}
            isActive={selectedWindowMode === SubmissionWindowMode.MinMaxVersion}
          />
        </ControlRadioButton>

        <ControlRadioButton
          value={selectedWindowMode}
          name="lastXDays"
          selectedClass={selectedClass}
          isSelected={selectedWindowMode === SubmissionWindowMode.LastXDays}
          onChange={() => setSelectedWindowMode(SubmissionWindowMode.LastXDays)}
        >
          <span
            className={styles['option-title']}
            style={
              selectedWindowMode === SubmissionWindowMode.LastXDays ? labelTitleSelectedStyle : {}
            }
          >
            League:
          </span>
          <span className={styles['option-description']}>{renderLastXDays()}</span>
          <NumberOfDaysSlider
            selectedClass={selectedClass}
            value={lastXDays}
            onChange={setLastXDays}
            onPointerDown={() => setSelectedWindowMode(SubmissionWindowMode.LastXDays)}
            isActive={selectedWindowMode === SubmissionWindowMode.LastXDays}
          />
        </ControlRadioButton>

        <ButtonRow>
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={handleApply} selectedClass={selectedClass}>
            Apply
          </PrimaryButton>
        </ButtonRow>
      </div>
    </Modal>
  )
}

export default SubmissionWindowModal
