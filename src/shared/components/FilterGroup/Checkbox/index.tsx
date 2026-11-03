import { isValidElement, memo, useEffect, useRef, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import {
  FilterTypeCard,
  FilterTypeTalent,
  FilterTypeEvent,
  FilterTypeTransmute,
} from '@/shared/types/filters'

import styles from './index.module.scss'

const cx = createCx(styles)

const LONG_LABEL_LENGTH = 12

const getTextLength = (node: React.ReactNode): number => {
  if (typeof node === 'string' || typeof node === 'number') return String(node).length
  if (Array.isArray(node)) return node.reduce((sum: number, child) => sum + getTextLength(child), 0)
  if (isValidElement<{ children?: React.ReactNode }>(node))
    return getTextLength(node.props.children)
  return 0
}

interface CheckboxProps {
  name: string
  checkboxLabel: React.ReactNode
  checked: boolean
  onChange: () => void
  type: FilterTypeCard | FilterTypeTalent | FilterTypeEvent | FilterTypeTransmute
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
    `checkbox-label--${type}--${name.replaceAll(' ', '-')}`
  )
  const checkboxClassName = cx('checkbox', `checkbox--${type}`)
  const labelTextClassName = cx('checkbox-label-text', `checkbox-label-text--${type}`, {
    'checkbox-label-text--checked': isHydrated ? checked : false,
    'checkbox-label-text--long': getTextLength(checkboxLabel) > LONG_LABEL_LENGTH,
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

export default memo(Checkbox)
