import { memo } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { DropdownArrowIconUrl } from '@/shared/utils/icons'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ControlGroupProps<T> {
  id: string
  selectedClass: CharacterClass
  label: string
  options: Option<T>[]
  value: T
  onChange?: (value: T) => void
  disabled?: boolean
  onClick?: () => void
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
  onClick,
}: ControlGroupProps<T>) {
  const darkestColor = getClassColor(selectedClass, ClassColorVariant.Darkest)
  const defaultColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const selectColor = getClassColor(selectedClass, ClassColorVariant.ControlText)
  const selectBorderColor = getClassColor(selectedClass, ClassColorVariant.Dark)

  const labelStyle = { color: defaultColor }
  const labelDisabledStyle = { color: darkestColor }
  const selectStyle = {
    borderColor: selectBorderColor,
    color: selectColor,
    backgroundImage: DropdownArrowIconUrl(selectColor),
  }

  const renderOptions = (options: Option<T>[]) => {
    const optionsToRender = onClick ? options.filter((option) => option.value === value) : options

    return optionsToRender.map(({ value, label }) => (
      <option key={value as string} value={value as string}>
        {label}
      </option>
    ))
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!onChange) return

    const newValue = typeof value === 'number' ? Number(e.target.value) : e.target.value

    onChange(newValue as T)
  }

  const handleClick = (e: React.MouseEvent<HTMLSelectElement>) => {
    if (onClick) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div className={cx('group')}>
      <label htmlFor={id} style={disabled ? labelDisabledStyle : labelStyle}>
        {label}
      </label>
      <select
        id={id}
        value={value as string}
        onChange={handleChange}
        disabled={disabled}
        style={selectStyle}
        onClick={handleClick}
        onMouseDown={handleClick}
      >
        {renderOptions(options)}
      </select>
    </div>
  )
}

export default memo(ControlGroup) as <T>(props: ControlGroupProps<T>) => JSX.Element
