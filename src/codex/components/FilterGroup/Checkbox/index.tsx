import cx from 'classnames'

import { FilterType } from '../../../types/filters'

import styles from './index.module.scss'

interface CheckboxProps {
  checkboxLabel: React.ReactNode
  checked: boolean
  onChange: () => void
  type: FilterType
}

const Checkbox = ({ checkboxLabel, checked, onChange, type }: CheckboxProps) => {
  const labelClassName = cx(styles['checkbox-label'], styles[`checkbox-label--${type}`])
  const labelTextClassName = cx(styles['checkbox-label-text'], {
    [styles['checkbox-label-text--checked']]: checked,
  })

  return (
    <label className={labelClassName}>
      <input type="checkbox" checked={checked} onChange={onChange} className={styles['checkbox']} />
      <span className={labelTextClassName}>{checkboxLabel}</span>
    </label>
  )
}

export default Checkbox
