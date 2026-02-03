import { createCx } from '@/shared/utils/classnames'
import GradientDivider from '@/shared/components/GradientDivider'

import { FilterTypeCard, FilterTypeTalent } from '@/codex/types/filters'

import Checkbox from './Checkbox'
import styles from './index.module.scss'

const cx = createCx(styles)

interface FilterGroupProps {
  title: string
  filters: string[]
  selectedFilters: Record<string, boolean>
  type: FilterTypeCard | FilterTypeTalent
  onFilterToggle: (filter: string) => void
  getFilterLabel?: (filter: string) => React.ReactNode
  className?: string
}
function FilterGroup({
  title,
  filters,
  selectedFilters,
  type,
  onFilterToggle,
  getFilterLabel,
  className,
}: FilterGroupProps) {
  const checkboxesClassName = cx('check-boxes', `check-boxes--${type}`, className)

  return (
    <div className={cx('filter-group')}>
      <h4>{title}</h4>
      <GradientDivider spacingBottom="sm" />
      <div className={checkboxesClassName}>
        {filters.map((filter) => (
          <Checkbox
            key={filter}
            name={filter}
            checked={selectedFilters[filter]}
            onChange={() => onFilterToggle(filter)}
            checkboxLabel={getFilterLabel ? getFilterLabel(filter) : filter}
            type={type}
          />
        ))}
      </div>
    </div>
  )
}

export default FilterGroup
