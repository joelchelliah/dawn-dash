import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  REMOVED_TALENTS,
  REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP,
} from '../constants/talentsMappingValues'
import { RequirementFilterOption } from '../types/filters'
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
 * Splits talents that have multiple sets of event requirements
 * into separate nodes for each set of requirements.
 * This helps ease the complexity of the visualization by
 * showing these as separate nodes.
 */
export const splitTalentsThatHaveMultipleSetsOfEventRequirements = (
  talents: TalentData[]
): TalentData[] => {
  const result: TalentData[] = []

  for (const talent of talents) {
    const hasEventRequirementMatrix =
      talent.event_requirement_matrix && talent.event_requirement_matrix.length > 0

    // If talent has multiple event requirement sets, split it
    if (hasEventRequirementMatrix && talent.event_requirement_matrix.length > 1) {
      talent.event_requirement_matrix.forEach((eventRequirements) => {
        result.push({
          ...talent,
          event_requirement_matrix: [eventRequirements],
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

/**
 * Determines the appropriate class or energy requirements for a talent node
 * based on its context (parent requirements, event requirements, and special cases).
 *
 * Logic:
 * 1. Combines parent requirements with the talent's own class/energy requirements
 * 2. If parent is an event node AND talent has event requirements, use only event requirements
 * 3. Special case for Devotion: Children of Devotion have no requirements shown
 */
export const getClassOrEnergyRequirements = (
  talent: TalentData,
  parentRequirements: string[],
  devotionBlightbaneId: number | null
): string[] => {
  const eventRequirements =
    talent.event_requirement_matrix && talent.event_requirement_matrix.length > 0
      ? talent.event_requirement_matrix[0]
      : []

  const defaultClassOrEnergyRequirements = Array.from(
    new Set(
      [...parentRequirements, ...talent.requires_classes, ...talent.requires_energy].filter(
        isNotNullOrUndefined
      )
    )
  )
  let classOrEnergyRequirements = defaultClassOrEnergyRequirements

  // If the parent is an event node,
  // only use the talent's event requirements
  if (parentRequirements.includes(RequirementFilterOption.ObtainedFromEvents)) {
    classOrEnergyRequirements = eventRequirements
  }

  // If the parent is a card or offer requirement node,
  // do not show any requirements
  else if (
    parentRequirements.includes(RequirementFilterOption.ObtainedFromCards) ||
    parentRequirements.includes(RequirementFilterOption.Offer)
  ) {
    classOrEnergyRequirements = []
  }

  // Special case: Direct children of Devotion should not show HOLY requirement!
  // e.g:
  //  * Priest -> Devotion -> Pious. should NOT show HOLY
  //  * WindyHillock -> Pious. SHOULD show HOLY
  else if (
    talent.requires_talents.length > 0 &&
    devotionBlightbaneId &&
    talent.requires_talents.includes(devotionBlightbaneId)
  ) {
    classOrEnergyRequirements = defaultClassOrEnergyRequirements.filter(
      (requirement) => requirement !== 'HOLY'
    )
  }

  // If parent requirements is a class requirement,
  // it can have no other class requirements (no dual classes in this game!)
  const classRequirements = Object.keys(REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP)
  const parentClassRequirement = parentRequirements.find((requirement) =>
    classRequirements.includes(requirement)
  )

  if (parentClassRequirement) {
    classOrEnergyRequirements = classOrEnergyRequirements.filter(
      (requirement) =>
        requirement === parentClassRequirement || !classRequirements.includes(requirement)
    )
  }

  return classOrEnergyRequirements
}
