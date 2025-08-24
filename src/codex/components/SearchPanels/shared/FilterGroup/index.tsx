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
}
function FilterGroup({
  title,
  filters,
  selectedFilters,
  type,
  onFilterToggle,
  getFilterLabel,
}: FilterGroupProps) {
  const className = cx('check-boxes', `check-boxes--${type}`)

  return (
    <div className={cx('filter-group')}>
      <h4>{title}</h4>
      <GradientDivider spacingBottom="sm" />
      <div className={className}>
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
