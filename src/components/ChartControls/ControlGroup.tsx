import { memo } from 'react'

import { SpeedRunClass } from '../../types/speedRun'
import { ClassColorVariant, getClassColor } from '../../utils/colors'
import { DropdownArrowIconUrl } from '../../utils/icons'

import styles from './ControlGroup.module.scss'

interface ControlGroupProps<T> {
  id: string
  selectedClass: SpeedRunClass
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

interface Option<T> {
  value: T
  label: string
}

function ControlGroup<T>({
  id,
  selectedClass,
  label,
  options,
  value,
  onChange,
  disabled,
}: ControlGroupProps<T>) {
  const isSunforge = selectedClass === SpeedRunClass.Sunforge

  const darkColor = getClassColor(selectedClass, ClassColorVariant.Dark)
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const selectColor = getClassColor(selectedClass, ClassColorVariant.ControlText)
  const selectBorderColor = getClassColor(selectedClass, ClassColorVariant.ControlBorder)

  const labelStyle = { color: defaultColor }
  const labelDisabledStyle = { color: darkColor }
  const selectStyle = {
    borderColor: selectBorderColor,
    color: selectColor,
    backgroundImage: DropdownArrowIconUrl(selectColor),
  }

  const renderOptions = (options: Option<T>[]) =>
    options.map(({ value, label }) => (
      <option key={value as string} value={value as string}>
        {label}
      </option>
    ))

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = typeof value === 'number' ? Number(e.target.value) : e.target.value

    onChange(newValue as T)
  }

  return (
    <div className={styles['group']}>
      <label htmlFor={id} style={isSunforge ? labelDisabledStyle : labelStyle}>
        {label}
      </label>
      <select
        id={id}
        value={value as string}
        onChange={handleChange}
        disabled={disabled}
        style={selectStyle}
      >
        {renderOptions(options)}
      </select>
    </div>
  )
}

export default memo(ControlGroup) as <T>(props: ControlGroupProps<T>) => JSX.Element
