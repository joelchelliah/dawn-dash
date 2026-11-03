import { useMemo } from 'react'

import { SharedFilterOption } from '@/shared/types/filters'
import { createFilterUrlCodec } from '@/shared/utils/filterUrlCodec'
import { createFilterHook } from '@/shared/hooks/useSearchFilters/useFilterFactory'

import { TransmuteEnergyAttribute } from '@/transmute/types/rules'
import {
  EnergyAttribute,
  EnergyAttributeFilterOption,
  TransmuteSearchFilterCache,
} from '@/transmute/types/filters'

const defaultFilters = {
  [EnergyAttributeFilterOption.Dexterity]: true,
  [EnergyAttributeFilterOption.Intelligence]: true,
  [EnergyAttributeFilterOption.Strength]: true,
  [EnergyAttributeFilterOption.Holy]: true,
  [SharedFilterOption.All]: true,
  [SharedFilterOption.None]: false,
}

const valueToStringMap = {
  [EnergyAttributeFilterOption.Dexterity]: 'Dexterity',
  [EnergyAttributeFilterOption.Intelligence]: 'Intelligence',
  [EnergyAttributeFilterOption.Strength]: 'Strength',
  [EnergyAttributeFilterOption.Holy]: 'Access to Holy',
}

const energyAttributeByOption: Record<EnergyAttributeFilterOption, TransmuteEnergyAttribute> = {
  [EnergyAttributeFilterOption.Dexterity]: 'dex',
  [EnergyAttributeFilterOption.Intelligence]: 'int',
  [EnergyAttributeFilterOption.Strength]: 'str',
  [EnergyAttributeFilterOption.Holy]: 'holy',
}

export const allEnergyAttributes: string[] = EnergyAttribute.getAll()

export const energyAttributeUrlCodec = createFilterUrlCodec('attributes', energyAttributeByOption)

const useBaseEnergyAttributeFilters = createFilterHook({
  defaultFilters,
  allValues: allEnergyAttributes,
  valueToStringMap,
})

export const useEnergyAttributeFilters = (
  cachedFilters?: TransmuteSearchFilterCache['energyAttributes']
) => {
  const { filters, handleFilterToggle, getValueToString, enableFilters, resetFilters } =
    useBaseEnergyAttributeFilters(cachedFilters)

  // Stable reference (only changes when the filter state changes), for the lookup functions
  const selectedEnergyAttributes = useMemo(
    () =>
      Object.values(EnergyAttributeFilterOption)
        .filter((option) => filters[option])
        .map((option) => energyAttributeByOption[option]),
    [filters]
  )

  return {
    energyAttributeFilters: filters,
    selectedEnergyAttributes,
    handleEnergyAttributeFilterToggle: handleFilterToggle,
    enableEnergyAttributeFilters: enableFilters,
    resetEnergyAttributeFilters: resetFilters,
    getEnergyAttributeFilterName: getValueToString,
  }
}
