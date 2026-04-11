import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

export interface ScoringTableColumn<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  className?: string
}

interface ScoringTableProps<T> {
  mode: ScoringMode
  columns: ScoringTableColumn<T>[]
  data: T[]
  className?: string
}

function ScoringTable<T extends Record<string, unknown>>({
  mode,
  columns,
  data,
  className,
}: ScoringTableProps<T>): JSX.Element {
  const getCellContent = (row: T, column: ScoringTableColumn<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    const value = row[column.accessor]
    return typeof value === 'number' ? value.toLocaleString() : value
  }

  return (
    <table className={cx('table', className)}>
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index} className={cx(`mode--${mode}`)}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex} className={cx(`mode--${mode}`)}>
            {columns.map((column, colIndex) => (
              <td key={colIndex} className={cx(column.className, `${column.className}--${mode}`)}>
                {getCellContent(row, column) as React.ReactNode}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ScoringTable
