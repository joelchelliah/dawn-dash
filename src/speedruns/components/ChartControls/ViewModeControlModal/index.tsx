import { useEffect, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Button from '@/shared/components/Buttons/Button'
import ButtonRow from '@/shared/components/Buttons/ButtonRow'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import { VIEW_MODE_LABELS } from '@/speedruns/constants/chartControlValues'
import { ViewMode } from '@/speedruns/types/chart'

import PrimaryButton from '../../Buttons/PrimaryButton'
import ClassModal from '../../ClassModal'
import ControlRadioButton from '../ControlRadioButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ViewModeModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (viewMode: ViewMode) => void
  selectedClass: CharacterClass
  currentViewMode: ViewMode
}

function getViewModeDescription(mode: ViewMode): React.ReactNode {
  switch (mode) {
    case ViewMode.All:
      return <span>All available runs, from both verified and anonymous players.</span>
    case ViewMode.Improvements:
      return (
        <span>
          Runs where the players improved their{' '}
          <span className={cx('option-description__highlight')}>personal best time</span>. Only runs
          that have beaten an earlier personal record are included.
        </span>
      )
    case ViewMode.Records:
      return (
        <span>
          Runs that broke the{' '}
          <span className={cx('option-description__highlight')}>global record</span> at the time of
          submission.
        </span>
      )
    default:
      return null
  }
}

function ViewModeModal({
  isOpen,
  onClose,
  onApply,
  selectedClass,
  currentViewMode,
}: ViewModeModalProps) {
  const [selectedViewMode, setSelectedViewMode] = useState(currentViewMode)

  useEffect(() => {
    setSelectedViewMode(currentViewMode)
  }, [currentViewMode, isOpen])

  if (!isOpen) return null

  const lighterColor = getClassColor(selectedClass, ClassColorVariant.Lighter)
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const darkColor = getClassColor(selectedClass, ClassColorVariant.Dark)

  const headerStyle = {
    color: defaultColor,
    borderColor: darkColor,
  } as React.CSSProperties

  const handleApply = () => {
    onApply(selectedViewMode)
    onClose()
  }

  return (
    <ClassModal isOpen={isOpen} onClose={onClose} selectedClass={selectedClass}>
      <div className={cx('container')}>
        <h3 style={headerStyle}>View Mode</h3>
        <div className={cx('options')}>
          {Object.values(ViewMode).map((mode) => {
            const isSelected = selectedViewMode === mode
            const labelTitleSelectedStyle = {
              color: lighterColor,
            } as React.CSSProperties
            const labelTitleStyle = isSelected ? labelTitleSelectedStyle : {}
            const optionDescriptionClassName = cx('option-description', {
              'option-description--active': isSelected,
            })

            return (
              <ControlRadioButton
                key={mode}
                value={mode}
                name="viewMode"
                selectedClass={selectedClass}
                isSelected={isSelected}
                onChange={() => setSelectedViewMode(mode)}
              >
                <span className={cx('option-title')} style={labelTitleStyle}>
                  {VIEW_MODE_LABELS[mode]}
                </span>
                <span className={optionDescriptionClassName}>{getViewModeDescription(mode)}</span>
              </ControlRadioButton>
            )
          })}
        </div>
        <ButtonRow>
          <Button onClick={onClose}>Cancel</Button>
          <PrimaryButton onClick={handleApply} selectedClass={selectedClass}>
            Apply
          </PrimaryButton>
        </ButtonRow>
      </div>
    </ClassModal>
  )
}

export default ViewModeModal
