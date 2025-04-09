import cx from 'classnames'

import styles from './index.module.scss'

interface FilterGroupProps {
  title: string
  filters: string[]
  selectedFilters: Record<string, boolean>
  type: 'card-set' | 'rarity' | 'banner'
  onFilterToggle: (filter: string) => void
}
function FilterGroup({ title, filters, selectedFilters, type, onFilterToggle }: FilterGroupProps) {
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
            {filter}
          </label>
        ))}
      </div>
    </div>
  )
}

export default FilterGroup
