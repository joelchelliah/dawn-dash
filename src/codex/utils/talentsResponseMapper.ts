import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  TalentData,
  TalentTree,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeRequirementNodeType,
  TalentTreeTalentNode,
} from '@/codex/types/talents'

import { RequirementFilterOption } from '../types/filters'
import {
  ACTUALLY_EVENT_ONLY_TALENTS,
  REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP,
} from '../constants/talentsMappingValues'

import {
  getClassOrEnergyRequirements,
  getFilterOptionsForRequirement,
  removeDuplicateAndNonExistingTalents,
  splitTalentsThatHaveMultipleSetsOfEventRequirements,
  splitTalentsThatHaveMultipleClassesAndOtherRequirements,
} from './talentDataHelper'

export const mapTalentsDataToTalentTree = (unparsedTalents: TalentData[]): TalentTree => {
  const correctedUnparsedTalents = unparsedTalents.map((talent) => ({
    ...talent,
    expansion: isEventOnlyTalent(talent) ? 0 : talent.expansion,
  }))
  const uniqueUnparsedTalents = removeDuplicateAndNonExistingTalents(correctedUnparsedTalents)
  const classAndEnergySplitTalents =
    splitTalentsThatHaveMultipleClassesAndOtherRequirements(uniqueUnparsedTalents)
  const preProcessedTalents = splitTalentsThatHaveMultipleSetsOfEventRequirements(
    classAndEnergySplitTalents
  )
  const idToPreProcessedTalent = new Map(
    preProcessedTalents.map((talent) => [talent.blightbane_id, talent])
  )
  const uniqueEvents = Array.from(
    new Set(preProcessedTalents.flatMap((talent) => talent.events))
  ).sort()

  function buildTalentNode(
    talent: TalentData,
    parentName: string | undefined,
    parentRequirements: string[],
    visited = new Set<number>()
  ): TalentTreeTalentNode {
    if (visited.has(talent.blightbane_id)) {
      throw new Error(`💀  Failed to parse talent: ${talent.name} (Recursive loop detected!)`)
    }
    if (talent.event_requirement_matrix && talent.event_requirement_matrix.length > 1) {
      throw new Error(
        `💀  Multiple sets of event requirements detected for talent: ${talent.name}! This should NOT happen!`
      )
    }

    const classOrEnergyRequirements = getClassOrEnergyRequirements(
      talent,
      parentRequirements,
      preProcessedTalents.find(({ name }) => name === 'Devotion')?.blightbane_id ?? null
    )

    // Don't include talent requirements if talent is obtained from events.
    // Exception: Blessing of Serem-Pek.
    const skipRequiresTalents =
      parentName === 'ObtainedFromEvents' && talent.name !== 'Blessing of Serem-Pek'
    const talentRequirements = skipRequiresTalents
      ? []
      : (talent.requires_talents
          .map((id) => idToPreProcessedTalent.get(id)?.name)
          .filter((name) => isNotNullOrUndefined(name) && name !== parentName) as string[])

    // Don't include card requirements if talent is obtained from events or no requirements.
    // Special rule for Compassionate.
    const skipRequiredCards =
      parentName === 'No Requirements' || parentName === 'ObtainedFromEvents'
    const otherRequirements = [
      ...(skipRequiredCards ? [] : talent.requires_cards),
      talent.name === 'Compassionate' ? 'Healing potion' : undefined,
    ].filter(isNotNullOrUndefined)

    const newVisited = new Set(visited).add(talent.blightbane_id)
    const children = (talent.required_for_talents || [])
      .map((id) => idToPreProcessedTalent.get(id))
      .filter(isNotNullOrUndefined)
      .map((child) => buildTalentNode(child, talent.name, classOrEnergyRequirements, newVisited))

    const descendants = new Set<string>()
    const collectDescendantNames = (child: TalentTreeTalentNode) => {
      descendants.add(child.name)
      child.children.forEach(collectDescendantNames)
    }
    children.forEach(collectDescendantNames)

    return {
      type: TalentTreeNodeType.TALENT,
      name: talent.name,
      description: talent.description,
      flavourText: talent.flavour_text,
      tier: talent.tier,
      expansion: talent.expansion,
      events: talent.events,
      children,
      descendants: Array.from(descendants),
      classOrEnergyRequirements,
      talentRequirements,
      otherRequirements,
    }
  }

  const createTalentNodes = (
    predicate: (talent: TalentData) => boolean,
    parentRequirement: string
  ) =>
    sortNodes<TalentTreeTalentNode>(
      preProcessedTalents
        .filter(predicate)
        .map((talent) => buildTalentNode(talent, parentRequirement, [parentRequirement]))
    )

  const createRequirementNodes = (
    requirements: string[],
    nodeType: TalentTreeRequirementNodeType,
    predicateMapper: (requirement: string) => (talent: TalentData) => boolean,
    filterMapper: (requirement: string) => RequirementFilterOption[],
    overridenRequirementForChildrenMapping?: string
  ): TalentTreeRequirementNode[] =>
    requirements.map((requirement) => ({
      type: nodeType,
      name: requirement,
      requirementFilterOptions: filterMapper(requirement),
      children: createTalentNodes(
        predicateMapper(requirement),
        overridenRequirementForChildrenMapping ?? requirement
      ),
    }))

  const rootNoRequirementsNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.NO_REQUIREMENTS,
    name: 'No Requirements',
    requirementFilterOptions: [RequirementFilterOption.NoRequirements],
    children: createTalentNodes(isRootTalent, 'No Requirements'),
  }

  const rootClassRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    Object.keys(REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP),
    TalentTreeNodeType.CLASS_REQUIREMENT,
    hasClass,
    getClassFilterOptionsForRequirement
  )

  const rootEnergyRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    Object.keys(REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP),
    TalentTreeNodeType.ENERGY_REQUIREMENT,
    hasEnergy,
    getEnergyFilterOptionsForRequirement
  )

  const rootEventRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    uniqueEvents,
    TalentTreeNodeType.EVENT_REQUIREMENT,
    isValidEventTalent,
    () => [RequirementFilterOption.ObtainedFromEvents],
    // Overriding the requirement here so that the event name is not used as a requirement for the children
    RequirementFilterOption.ObtainedFromEvents
  )

  const rootCardRequirementNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.CARD_REQUIREMENT,
    name: 'Obtained from cards',
    requirementFilterOptions: [RequirementFilterOption.ObtainedFromCards],
    children: createTalentNodes(hasCardRequirement, RequirementFilterOption.ObtainedFromCards),
  }

  const rootOfferNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.OFFER_REQUIREMENT,
    name: 'Offers',
    requirementFilterOptions: [RequirementFilterOption.Offer],
    children: createTalentNodes(isOffer, RequirementFilterOption.Offer),
  }

  return {
    noReqNode: rootNoRequirementsNode,
    classNodes: rootClassRequirementNodes,
    energyNodes: rootEnergyRequirementNodes,
    eventNodes: rootEventRequirementNodes,
    cardNode: rootCardRequirementNode,
    offerNode: rootOfferNode,
  }
}

const isEventOnlyTalent = (talent: TalentData) => ACTUALLY_EVENT_ONLY_TALENTS.includes(talent.name)

const isOffer = (talent: TalentData) => talent.expansion === 0 && talent.name.startsWith('Offer of')

const hasCardRequirement = (talent: TalentData) =>
  talent.requires_cards.length > 0 && talent.requires_talents.length === 0

const isValidEventTalent = (eventName: string) => (talent: TalentData) =>
  talent.events.includes(eventName)

const isRootTalent = (talent: TalentData) =>
  talent.requires_talents.length === 0 &&
  talent.requires_classes.length === 0 &&
  talent.requires_energy.length === 0 &&
  talent.expansion !== 0

const hasClass = (className: string) => (talent: TalentData) =>
  talent.requires_classes.includes(className) && talent.requires_talents.length === 0
const hasEnergy = (energy: string) => (talent: TalentData) =>
  talent.requires_energy.includes(energy) && talent.requires_talents.length === 0

/**
 * Sorts either talents or requirement nodes by specific criteria.
 * * For talents, it sorts by tier and name.
 * * For requirements, it sorts by name.
 */
const sortNodes = <T extends TalentTreeTalentNode | TalentTreeRequirementNode>(talents: T[]): T[] =>
  talents.sort((a, b) => {
    if (a.type === TalentTreeNodeType.TALENT && b.type === TalentTreeNodeType.TALENT) {
      return a.tier !== b.tier ? a.tier - b.tier : a.name.localeCompare(b.name)
    }
    return a.name.localeCompare(b.name)
  })

const getClassFilterOptionsForRequirement = (requirement: string): RequirementFilterOption[] =>
  getFilterOptionsForRequirement('class', requirement)

const getEnergyFilterOptionsForRequirement = (requirement: string): RequirementFilterOption[] =>
  getFilterOptionsForRequirement('energy', requirement)
