import React from 'react'

import cx from 'classnames'

import { SpeedRunClass } from '../../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../../utils/colors'
import { getEnergyImageUrl } from '../../../utils/images'

import styles from './index.module.scss'

interface ControlRadioButtonProps {
  selectedClass: SpeedRunClass
  value: string
  name: string
  onChange: (value: string) => void
  isSelected: boolean
  children: React.ReactNode
}

function ControlRadioButton({
  value,
  name,
  selectedClass,
  isSelected,
  onChange,
  children,
}: ControlRadioButtonProps) {
  const darkestColor = getClassColor(selectedClass, ClassColorVariant.Darkest)

  const radioButtonClassName = cx(styles['radio-button'], {
    [styles['radio-button--selected']]: isSelected,
  })
  const radioButtonStyle = {
    borderColor: darkestColor,
  } as React.CSSProperties

  const customRadioStyle = {
    '--energy-icon': `url(${getEnergyImageUrl(selectedClass)})`,
    '--border-color': darkestColor,
  } as React.CSSProperties

  return (
    <label key={value} className={radioButtonClassName} style={radioButtonStyle}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        className={styles['radio-button__input']}
      />
      <span className={styles['radio-button__custom']} style={customRadioStyle} />
      <span className={styles['radio-button__label']}>{children}</span>
    </label>
  )
}

export default ControlRadioButton
