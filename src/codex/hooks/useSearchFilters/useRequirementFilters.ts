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
  [SharedFilterOption.All]: true,
  [SharedFilterOption.None]: false,
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
}

export const allRequirements: string[] = Requirement.getAll()

const useBaseRequirementFilters = createFilterHook({
  defaultFilters,
  allValues: allRequirements,
  indexMap,
})

export const useRequirementFilters = (
  cachedFilters?: TalentCodexSearchFilterCache['requirements']
) => {
  const { filters, handleFilterToggle, resetFilters } = useBaseRequirementFilters(cachedFilters)

  const isRequirementSelectedOrIrrelevant = (option?: RequirementFilterOption) =>
    // Irrelevant if we are dealing with offers or events
    !option || filters[option]

  return {
    requirementFilters: filters,
    isRequirementSelectedOrIrrelevant,
    handleRequirementFilterToggle: handleFilterToggle,
    resetRequirementFilters: resetFilters,
  }
}
