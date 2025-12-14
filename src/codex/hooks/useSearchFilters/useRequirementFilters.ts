import {
  RequirementFilterOption,
  Requirement,
  TalentCodexSearchFilterCache,
  SharedFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [RequirementFilterOption.NoRequirements]: true,
  [RequirementFilterOption.Dexterity]: true,
  [RequirementFilterOption.Intelligence]: true,
  [RequirementFilterOption.Strength]: true,
  [RequirementFilterOption.Arcanist]: true,
  [RequirementFilterOption.Hunter]: true,
  [RequirementFilterOption.Knight]: true,
  [RequirementFilterOption.Rogue]: true,
  [RequirementFilterOption.Seeker]: true,
  [RequirementFilterOption.Warrior]: true,
  [RequirementFilterOption.Sunforge]: true,
  [RequirementFilterOption.ObtainedFromEvents]: true,
  [RequirementFilterOption.Offer]: true,
  [RequirementFilterOption.ObtainedFromCards]: true,
  [SharedFilterOption.All]: true,
  [SharedFilterOption.None]: false,
}

const valueToStringMap = {
  [RequirementFilterOption.NoRequirements]: 'No requirements',
  [RequirementFilterOption.Dexterity]: 'Dexterity',
  [RequirementFilterOption.Intelligence]: 'Intelligence',
  [RequirementFilterOption.Strength]: 'Strength',
  [RequirementFilterOption.Arcanist]: 'Arcanist',
  [RequirementFilterOption.Hunter]: 'Hunter',
  [RequirementFilterOption.Knight]: 'Knight',
  [RequirementFilterOption.Rogue]: 'Rogue',
  [RequirementFilterOption.Seeker]: 'Seeker',
  [RequirementFilterOption.Warrior]: 'Warrior',
  [RequirementFilterOption.Sunforge]: 'Sunforge',
  [RequirementFilterOption.ObtainedFromEvents]: 'Obtained from events',
  [RequirementFilterOption.Offer]: 'Offer',
  [RequirementFilterOption.ObtainedFromCards]: 'Obtained from cards',
  [SharedFilterOption.All]: SharedFilterOption.All,
  [SharedFilterOption.None]: SharedFilterOption.None,
}

const indexMap = {
  [RequirementFilterOption.NoRequirements]: 0,
  [RequirementFilterOption.Dexterity]: 1,
  [RequirementFilterOption.Intelligence]: 2,
  [RequirementFilterOption.Strength]: 3,
  [RequirementFilterOption.Arcanist]: 4,
  [RequirementFilterOption.Hunter]: 5,
  [RequirementFilterOption.Knight]: 6,
  [RequirementFilterOption.Rogue]: 7,
  [RequirementFilterOption.Seeker]: 8,
  [RequirementFilterOption.Warrior]: 9,
  [RequirementFilterOption.Sunforge]: 10,
  [RequirementFilterOption.ObtainedFromEvents]: 11,
  [RequirementFilterOption.Offer]: 12,
  [RequirementFilterOption.ObtainedFromCards]: 13,
}

export const allRequirements: string[] = Requirement.getAll()

const useBaseRequirementFilters = createFilterHook({
  defaultFilters,
  allValues: allRequirements,
  valueToStringMap,
  indexMap,
})

export const useRequirementFilters = (
  cachedFilters?: TalentCodexSearchFilterCache['requirements']
) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseRequirementFilters(cachedFilters)

  const isRequirementSelected = (options: RequirementFilterOption[]) =>
    options.some((option) => filters[option])

  return {
    requirementFilters: filters,
    isRequirementSelected,
    handleRequirementFilterToggle: handleFilterToggle,
    resetRequirementFilters: resetFilters,
    getRequirementFilterName: getValueToString,
  }
}
