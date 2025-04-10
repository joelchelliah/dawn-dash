import { useState } from 'react'

import { SharedFilterOption } from '../types/filters'

/**
 * Factory function to create reusable filter hooks
 */
export function createFilterHook({
  defaultFilters,
  allValues,
  indexMap,
  indexToValueMap,
  valueToStringMap,
}: {
  defaultFilters: Record<string, boolean>
  allValues: string[]
  indexMap?: Record<string, number | number[]>
  indexToValueMap?: Record<number, string>
  valueToStringMap?: Record<string, string>
}) {
  return () => {
    const [filters, setFilters] = useState<Record<string, boolean>>(defaultFilters)

    const selectedIndices = indexMap
      ? Object.keys(filters)
          .filter((key) => filters[key])
          .flatMap((filter) => {
            const indices = indexMap[filter]
            // Special case for card sets that have multiple indices
            return indices ? (Array.isArray(indices) ? indices : [indices]) : []
          })
      : []

    const isIndexSelected = (index: number) => {
      return selectedIndices.includes(index)
    }

    const getValueFromIndex = indexToValueMap
      ? (index: number) => {
          return indexToValueMap[index] || ''
        }
      : () => ''

    const getValueToString = valueToStringMap
      ? (filter: string) => {
          return valueToStringMap[filter] || ''
        }
      : () => ''

    const handleFilterToggle = (filter: string) => {
      if (filter === SharedFilterOption.All) {
        const newFilters: Record<string, boolean> = {}
        allValues.forEach((key) => {
          newFilters[key] = key !== SharedFilterOption.None
        })
        setFilters(newFilters)
      } else if (filter === SharedFilterOption.None) {
        const newFilters: Record<string, boolean> = {}
        allValues.forEach((key) => {
          newFilters[key] = key === SharedFilterOption.None
        })
        setFilters(newFilters)
      } else {
        setFilters((prevFilters) => ({
          ...prevFilters,
          [SharedFilterOption.All]: false,
          [SharedFilterOption.None]: false,
          [filter]: !prevFilters[filter],
        }))
      }
    }

    const resetFilters = () => setFilters(defaultFilters)

    return {
      filters,
      isIndexSelected,
      getValueFromIndex,
      getValueToString,
      handleFilterToggle,
      resetFilters,
    }
  }
}
