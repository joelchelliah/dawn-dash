import cx from 'classnames'

import styles from './index.module.scss'

interface FilterGroupProps {
  title: string
  filters: string[]
  selectedFilters: Record<string, boolean>
  type: 'card-set' | 'rarity' | 'banner' | 'formatting'
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
      <div className={className}>
        {filters.map((filter) => (
          <label key={filter}>
            <input
              type="checkbox"
              checked={selectedFilters[filter]}
              onChange={() => onFilterToggle(filter)}
            />
            {getFilterLabel ? getFilterLabel(filter) : filter}
          </label>
        ))}
      </div>
    </div>
  )
}

export default FilterGroup
