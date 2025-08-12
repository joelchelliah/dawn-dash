import { useEffect, useRef, useState } from 'react'

import cx from 'classnames'

import { FilterType } from '../../../../../types/filters'

import styles from './index.module.scss'

interface CheckboxProps {
  name: string
  checkboxLabel: React.ReactNode
  checked: boolean
  onChange: () => void
  type: FilterType
}

const Checkbox = ({ checkboxLabel, checked, onChange, type, name }: CheckboxProps) => {
  const labelRef = useRef<HTMLLabelElement>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  /**
   * Hydration issues fix:
   *
   * On initial load, the cached filter values are loaded and applied to the component state.
   * To prevent hydration mismatches, we only apply the cached `checked` state after the component has
   * been hydrated on the client side. This way, both the server and client render the same initial state.
   *
   * See usage of `isHydrated` in `labelTextClassName`.
   */
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const labelClassName = cx(
    styles['checkbox-label'],
    styles[`checkbox-label--${type}`],
    styles[`checkbox-label--${type}--${name}`]
  )
  const checkboxClassName = cx(styles['checkbox'], styles[`checkbox--${type}`])
  const labelTextClassName = cx(styles['checkbox-label-text'], {
    [styles['checkbox-label-text--checked']]: isHydrated ? checked : false,
  })

  return (
    <label
      ref={labelRef}
      className={labelClassName}
      data-checked={isHydrated ? checked.toString() : 'false'}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className={checkboxClassName} />
      <span className={labelTextClassName}>{checkboxLabel}</span>
    </label>
  )
}

export default Checkbox
