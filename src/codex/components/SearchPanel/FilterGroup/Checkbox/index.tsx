import cx from 'classnames'

import { FilterType } from '../../../../types/filters'

import styles from './index.module.scss'

interface CheckboxProps {
  name: string
  checkboxLabel: React.ReactNode
  checked: boolean
  onChange: () => void
  type: FilterType
}

const Checkbox = ({ checkboxLabel, checked, onChange, type, name }: CheckboxProps) => {
  const labelClassName = cx(
    styles['checkbox-label'],
    styles[`checkbox-label--${type}`],
    styles[`checkbox-label--${type}--${name}`]
  )
  const checkboxClassName = cx(styles['checkbox'], styles[`checkbox--${type}`])
  const labelTextClassName = cx(styles['checkbox-label-text'], {
    [styles['checkbox-label-text--checked']]: checked,
  })

  return (
    <label className={labelClassName} data-checked={checked}>
      <input type="checkbox" checked={checked} onChange={onChange} className={checkboxClassName} />
      <span className={labelTextClassName}>{checkboxLabel}</span>
    </label>
  )
}

export default Checkbox
