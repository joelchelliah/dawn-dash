import { useEffect, useState } from 'react'

import { createCx } from '../../../../shared/utils/classnames'
import Button from '../../../../shared/components/Buttons/Button'
import ButtonRow from '../../../../shared/components/Buttons/ButtonRow'
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
import { isGameVersionRange, isLastXDays } from '../../../utils/gameVersion'
import PrimaryButton from '../../Buttons/PrimaryButton'
import SecondaryButton from '../../Buttons/SecondaryButton'
import ClassModal from '../../ClassModal'
import ControlRadioButton from '../ControlRadioButton'

import styles from './index.module.scss'

const cx = createCx(styles)

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
    const minMaxOptionDescriptionClassName = cx('option-description', {
      'option-description--active': selectedWindowMode === SubmissionWindowMode.MinMaxVersion,
    })

    if (minVersion === maxVersion) {
      return (
        <span className={minMaxOptionDescriptionClassName}>
          Only show runs submitted during: <br />
          <span className={cx('option-description__highlight')}>{min}</span>
        </span>
      )
    }

    return (
      <span className={minMaxOptionDescriptionClassName}>
        Only show runs submitted between: <br />
        <span className={cx('option-description__highlight')}>{min}</span> and{' '}
        <span className={cx('option-description__highlight')}>{max}</span>
      </span>
    )
  }

  const renderLastXDays = () => {
    const lastXDaysOptionDescriptionClassName = cx('option-description', {
      'option-description--active': selectedWindowMode === SubmissionWindowMode.LastXDays,
    })

    return (
      <span className={lastXDaysOptionDescriptionClassName}>
        Only show runs from the last{' '}
        <span className={cx('option-description__highlight')}>{lastXDays}</span> days
      </span>
    )
  }

  const labelTitleSelectedStyle = {
    color: lighterColor,
  } as React.CSSProperties

  return (
    <ClassModal isOpen={isOpen} onClose={onClose} selectedClass={selectedClass} maxWidth={800}>
      <div className={cx('container')}>
        <h3 style={headerStyle}>Submission Window</h3>

        <ControlRadioButton
          value={selectedWindowMode}
          name="versionRange"
          selectedClass={selectedClass}
          isSelected={selectedWindowMode === SubmissionWindowMode.MinMaxVersion}
          onChange={() => setSelectedWindowMode(SubmissionWindowMode.MinMaxVersion)}
        >
          <span
            className={cx('option-title')}
            style={
              selectedWindowMode === SubmissionWindowMode.MinMaxVersion
                ? labelTitleSelectedStyle
                : {}
            }
          >
            Game versions:
          </span>
          {renderMinMaxVersionsNamed()}
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
            className={cx('option-title')}
            style={
              selectedWindowMode === SubmissionWindowMode.LastXDays ? labelTitleSelectedStyle : {}
            }
          >
            Days since:
          </span>
          {renderLastXDays()}
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
    </ClassModal>
  )
}

export default SubmissionWindowModal
