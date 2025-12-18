import {
  REMOVED_TALENTS,
  REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP,
} from '../constants/talentsMappingValues'
import { TalentData } from '../types/talents'

/**
 * Removes duplicate talents and talents that are not actually in the game anymore.
 */
export const removeDuplicateAndNonExistingTalents = (talents: TalentData[]): TalentData[] => {
  const seen = new Set<string>()

  return talents.filter((talent) => {
    if (seen.has(talent.name)) return false
    if (REMOVED_TALENTS.includes(talent.name)) return false

    seen.add(talent.name)
    return true
  })
}

/**
 * Splits talents that have multiple class requirements AND other requirements (talents or energy)
 * into separate nodes for each class.
 * This helps ease the complexity of the visualization of talents that have
 * several sets of `class + other requirement` combinations, like: `Haemorrhager`.
 */
export const splitTalentsThatHaveMultipleClassesAndOtherRequirements = (
  talents: TalentData[]
): TalentData[] => {
  const result: TalentData[] = []

  for (const talent of talents) {
    const hasMultipleClasses = talent.requires_classes.length > 1
    const hasOtherRequirements =
      talent.requires_talents.length > 0 || talent.requires_energy.length > 0

    // If talent has multiple classes AND other requirements, split it
    if (hasMultipleClasses && hasOtherRequirements) {
      talent.requires_classes.forEach((className) => {
        result.push({
          ...talent,
          requires_classes: [className],
        })
      })
    } else {
      // Otherwise, keep the talent as-is
      result.push(talent)
    }
  }

  return result
}

/**
 * Returns the filter options for a given class or energy requirement,
 */
export const getFilterOptionsForRequirement = (type: 'class' | 'energy', requirement: string) => {
  return type === 'class'
    ? REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP[requirement]
    : REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP[requirement]
}
