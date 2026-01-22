import { memo } from 'react'

import Select from '@/shared/components/Select'
import { createCx } from '@/shared/utils/classnames'
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

function ControlGroup<T>(props: ControlGroupProps<T>) {
  return (
    <div className={cx('group')}>
      <Select {...props} />
    </div>
  )
}

export default memo(ControlGroup) as <T>(props: ControlGroupProps<T>) => JSX.Element
