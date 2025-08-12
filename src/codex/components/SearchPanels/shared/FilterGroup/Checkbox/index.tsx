import { useEffect, useRef, useState } from 'react'

import { createCx } from '../../../../../../shared/utils/classnames'
import { FilterType } from '../../../../../types/filters'

import styles from './index.module.scss'

const cx = createCx(styles)

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
    'checkbox-label',
    `checkbox-label--${type}`,
    `checkbox-label--${type}--${name}`
  )
  const checkboxClassName = cx('checkbox', `checkbox--${type}`)
  const labelTextClassName = cx('checkbox-label-text', {
    'checkbox-label-text--checked': isHydrated ? checked : false,
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
