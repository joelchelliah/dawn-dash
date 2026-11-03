import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface SegmentedControlProps<T extends string> {
  name: string
  ariaLabel: string
  options: readonly T[]
  selected: T
  getLabel: (option: T) => React.ReactNode
  getSubtitle?: (option: T) => React.ReactNode
  onChange: (option: T) => void
}

function SegmentedControl<T extends string>({
  name,
  ariaLabel,
  options,
  selected,
  getLabel,
  getSubtitle,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx('segmented-control')}>
      {options.map((option) => (
        <label key={option} className={cx('segment', { 'segment--selected': option === selected })}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={option === selected}
            onChange={() => onChange(option)}
            className={cx('segment__input')}
          />
          <span className={cx('segment__label')}>{getLabel(option)}</span>
          {getSubtitle && <span className={cx('segment__subtitle')}>{getSubtitle(option)}</span>}
        </label>
      ))}
    </div>
  )
}

export default SegmentedControl
