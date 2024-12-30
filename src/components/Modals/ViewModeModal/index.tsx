import { useEffect, useState } from 'react'

import cx from 'classnames'

import { VIEW_MODE_LABELS } from '../../../constants/chartControlValues'
import { ViewMode } from '../../../types/chart'
import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import { getEnergyImageUrl } from '../../../utils/images'
import Button from '../../Buttons/Button'
import ButtonRow from '../../Buttons/ButtonRow'
import PrimaryButton from '../../Buttons/PrimaryButton'
import Modal from '../Modal'

import styles from './index.module.scss'

interface ViewModeModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (viewMode: ViewMode) => void
  selectedClass: SpeedRunClass
  currentViewMode: ViewMode
}

function getViewModeDescription(mode: ViewMode): string {
  switch (mode) {
    case ViewMode.All:
      return 'Show all available runs, including anonymous runs.'
    case ViewMode.Improvements:
      return 'Show verified runs where the players improved their personal best time.'
    case ViewMode.Records:
      return 'Show verified runs that broke the global record at the time.'
    default:
      return ''
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
  const darkestColor = getClassColor(selectedClass, ClassColorVariant.Darkest)

  const headerStyle = {
    color: defaultColor,
    borderColor: darkColor,
  } as React.CSSProperties

  const optionStyle = {
    borderColor: darkestColor,
  } as React.CSSProperties

  const customRadioStyle = {
    '--energy-icon': `url(${getEnergyImageUrl(selectedClass)})`,
    '--border-color': darkestColor,
  } as React.CSSProperties

  const labelTitleSelectedStyle = {
    color: lighterColor,
  } as React.CSSProperties

  const handleApply = () => {
    onApply(selectedViewMode)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} selectedClass={selectedClass}>
      <div className={styles['container']}>
        <h3 style={headerStyle}>View Mode</h3>
        <div className={styles['options']}>
          {Object.values(ViewMode).map((mode) => {
            const isSelected = selectedViewMode === mode
            const optionClassName = cx(styles['option'], {
              [styles['option--selected']]: isSelected,
            })
            const labelTitleStyle = isSelected ? labelTitleSelectedStyle : {}

            return (
              <label key={mode} className={optionClassName} style={optionStyle}>
                <input
                  type="radio"
                  name="viewMode"
                  value={mode}
                  checked={selectedViewMode === mode}
                  onChange={() => setSelectedViewMode(mode)}
                  className={styles['radio-input']}
                />
                <span className={styles['radio-custom']} style={customRadioStyle} />
                <span className={styles['label']}>
                  <span className={styles['label__title']} style={labelTitleStyle}>
                    {VIEW_MODE_LABELS[mode]}
                  </span>
                  <span className={styles['label__description']}>
                    {getViewModeDescription(mode)}
                  </span>
                </span>
              </label>
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
    </Modal>
  )
}

export default ViewModeModal
