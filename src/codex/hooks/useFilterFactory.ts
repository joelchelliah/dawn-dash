import { useState } from 'react'

import { isNotNullOrUndefined } from '../../shared/utils/object'
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
  return (cachedFilters: Record<string, boolean> | undefined, defaultFilterValue?: string) => {
    const [filters, setFilters] = useState<Record<string, boolean>>(cachedFilters || defaultFilters)

    const selectedIndices = indexMap
      ? Object.keys(filters)
          .filter((key) => filters[key])
          .flatMap((filter) => {
            const indices = indexMap[filter]
            // Special case for card sets that have multiple indices
            return isNotNullOrUndefined(indices)
              ? Array.isArray(indices)
                ? indices
                : [indices]
              : []
          })
      : []

    const isIndexSelected = (index: number) => selectedIndices.includes(index)

    const getValueFromIndex = indexToValueMap
      ? (index: number) => {
          return indexToValueMap[index] ?? defaultFilterValue ?? ''
        }
      : () => ''

    const getValueToString = valueToStringMap
      ? (filter: string) => {
          return valueToStringMap[filter] || ''
        }
      : () => ''

    const handleFilterToggle = (filter: string) => {
      // 'ALL' is selected:
      if (filter === SharedFilterOption.All) {
        const newFilters: Record<string, boolean> = {}
        allValues.forEach((key) => {
          newFilters[key] = key !== SharedFilterOption.None
        })
        setFilters(newFilters)
        return
      }
      // 'NONE' is selected:
      if (filter === SharedFilterOption.None) {
        const newFilters: Record<string, boolean> = {}
        allValues.forEach((key) => {
          newFilters[key] = key === SharedFilterOption.None
        })
        setFilters(newFilters)
        return
      }

      setFilters((prevFilters) => {
        const updatedFilters = { ...prevFilters, [filter]: !prevFilters[filter] }

        const filterKeys = Object.keys(prevFilters)
        const hasAllOrNoneOptions =
          filterKeys.includes(SharedFilterOption.All) &&
          filterKeys.includes(SharedFilterOption.None)

        // If All/None options don't exist, just return the updated filters
        if (!hasAllOrNoneOptions) return updatedFilters

        // Correctly handle the 'ALL' and 'NONE' options based on state of regular filters
        const regularFilters = Object.entries(updatedFilters).filter(
          ([key]) => key !== SharedFilterOption.All && key !== SharedFilterOption.None
        )
        const allRegularTrue = regularFilters.every(([_, value]) => value)
        const allRegularFalse = regularFilters.every(([_, value]) => !value)

        return {
          ...updatedFilters,
          [SharedFilterOption.All]: allRegularTrue,
          [SharedFilterOption.None]: allRegularFalse,
        }
      })
    }

    const enableFilters = (keys: string[]) => {
      setFilters((prevFilters) => {
        return Object.keys(prevFilters).reduce(
          (acc, key) => {
            acc[key] = keys.includes(SharedFilterOption.All)
              ? key !== SharedFilterOption.None
              : keys.includes(key)
            return acc
          },
          {} as typeof prevFilters
        )
      })
    }

    const resetFilters = () => setFilters(defaultFilters)

    return {
      filters,
      isIndexSelected,
      getValueFromIndex,
      getValueToString,
      handleFilterToggle,
      enableFilters,
      resetFilters,
    }
  }
}
