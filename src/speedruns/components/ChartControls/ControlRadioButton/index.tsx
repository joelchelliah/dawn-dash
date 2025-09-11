import React, { memo } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import { getEnergyImageUrl } from '@/speedruns/utils/images'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ControlRadioButtonProps {
  selectedClass: CharacterClass
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

  const radioButtonClassName = cx('radio-button', {
    'radio-button--selected': isSelected,
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
        className={cx('radio-button__input')}
      />
      <span className={cx('radio-button__custom')} style={customRadioStyle} />
      <span className={cx('radio-button__label')}>{children}</span>
    </label>
  )
}

export default memo(ControlRadioButton)
