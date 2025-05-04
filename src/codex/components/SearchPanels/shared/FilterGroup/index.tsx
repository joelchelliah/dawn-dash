import cx from 'classnames'

import GradientDivider from '../../../../../shared/components/GradientDivider'
import { FilterType } from '../../../../types/filters'

import Checkbox from './Checkbox'
import styles from './index.module.scss'

interface FilterGroupProps {
  title: string
  filters: string[]
  selectedFilters: Record<string, boolean>
  type: FilterType
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
  const className = cx(styles['check-boxes'], styles[`check-boxes--${type}`])

  return (
    <div className={styles['filter-group']}>
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
