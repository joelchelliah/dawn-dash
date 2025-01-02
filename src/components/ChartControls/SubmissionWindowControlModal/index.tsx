import { useEffect, useState } from 'react'

import DoubleThumbSlider from '../../../components/Sliders/DoubleThumbSlider'
import SingleThumbSlider from '../../../components/Sliders/SingleThumbSlider'
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
import SecondaryButton from '../../Buttons/SecondaryButton'
import Modal from '../../Modals/Modal'
import ControlRadioButton from '../ControlRadioButton'

import styles from './index.module.scss'

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

  const handleVersionChange = (min: string, max: string) => {
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

  const handleReset = () => {
    onApply({
      min: GAME_VERSION_VALUES[0],
      max: GAME_VERSION_VALUES[GAME_VERSION_VALUES.length - 1],
    })
    onClose()
  }

  const renderMinMaxVersionsNamed = () => {
    const min = SUBMISSION_WINDOW_LABEL_MAP[minVersion]
    const max = SUBMISSION_WINDOW_LABEL_MAP[maxVersion]

    if (minVersion === maxVersion) {
      return (
        <span>
          Only show runs submitted during: <br />
          <span className={styles['option-description__highlight']}>{min}</span>
        </span>
      )
    }

    return (
      <span>
        Only show runs submitted between: <br />
        <span className={styles['option-description__highlight']}>{min}</span> and{' '}
        <span className={styles['option-description__highlight']}>{max}</span>
      </span>
    )
  }

  const renderLastXDays = () => {
    return (
      <span>
        Only show runs from the last{' '}
        <span className={styles['option-description__highlight']}>{lastXDays}</span> days
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
          <DoubleThumbSlider
            ariaLabel="Game versions"
            selectedVal1={minVersion}
            selectedVal2={maxVersion}
            values={GAME_VERSION_VALUES}
            onChange={handleVersionChange}
            onPointerDown={() => setSelectedWindowMode(SubmissionWindowMode.MinMaxVersion)}
            isActive={selectedWindowMode === SubmissionWindowMode.MinMaxVersion}
            selectedClass={selectedClass}
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
            Days since:
          </span>
          <span className={styles['option-description']}>{renderLastXDays()}</span>
          <SingleThumbSlider
            ariaLabel="Days since"
            selectedValue={lastXDays}
            values={LAST_DAYS_VALUES}
            onChange={setLastXDays}
            onPointerDown={() => setSelectedWindowMode(SubmissionWindowMode.LastXDays)}
            isActive={selectedWindowMode === SubmissionWindowMode.LastXDays}
            selectedClass={selectedClass}
          />
        </ControlRadioButton>

        <ButtonRow>
          <SecondaryButton onClick={handleReset} selectedClass={selectedClass}>
            Reset
          </SecondaryButton>
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
