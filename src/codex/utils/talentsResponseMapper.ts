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
  EVENTS_BLACKLIST,
  EVENT_TALENTS_MAP_BLACKLIST,
  REMOVED_TALENTS,
  REQUIREMENT_CLASS_AND_ENERGY_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP,
} from '../constants/talentsMappingValues'

export const mapTalentsDataToTalentTree = (unparsedTalents: TalentData[]): TalentTree => {
  const correctedUnparsedTalents = unparsedTalents.map((talent) => ({
    ...talent,
    expansion: ACTUALLY_EVENT_ONLY_TALENTS.includes(talent.name) ? 0 : talent.expansion,
  }))
  const uniqueUnparsedTalents = removeDuplicateAndNonExistingTalents(correctedUnparsedTalents)
  const idToUnparsedTalent = new Map(
    uniqueUnparsedTalents.map((talent) => [talent.blightbane_id, talent])
  )
  const uniqueEvents = Array.from(
    new Set(
      uniqueUnparsedTalents
        .flatMap((talent) => talent.events)
        .filter((event) => !EVENTS_BLACKLIST.includes(event))
    )
  ).sort()

  function buildTalentNode(talent: TalentData, visited = new Set<number>()): TalentTreeTalentNode {
    if (visited.has(talent.blightbane_id)) {
      throw new Error(`💀  Failed to parse talent: ${talent.name} (Recursive loop detected!)`)
    }

    const newVisited = new Set(visited).add(talent.blightbane_id)
    const children = (talent.required_for_talents || [])
      .map((id) => idToUnparsedTalent.get(id))
      .filter(isNotNullOrUndefined)
      .map((child) => buildTalentNode(child, newVisited))

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
      classOrEnergyRequirements: [...talent.requires_classes, ...talent.requires_energy],
    }
  }

  const isOffer = (talent: TalentData) =>
    talent.expansion === 0 && talent.name.startsWith('Offer of')

  const isValidEventTalent = (eventName: string) => (talent: TalentData) =>
    talent.events.includes(eventName) &&
    (Object.keys(EVENT_TALENTS_MAP_BLACKLIST).includes(eventName)
      ? !EVENT_TALENTS_MAP_BLACKLIST[eventName].includes(talent.name)
      : true)

  const isRootTalent = (talent: TalentData) =>
    talent.requires_talents.length === 0 &&
    talent.requires_classes.length === 0 &&
    talent.requires_energy.length === 0 &&
    talent.expansion !== 0

  const hasClass = (className: string) => (talent: TalentData) =>
    talent.requires_classes.includes(className)
  const hasEnergy = (energy: string) => (talent: TalentData) =>
    talent.requires_energy.includes(energy)
  const hasOnlyClass = (className: string) => (talent: TalentData) =>
    hasClass(className)(talent) &&
    talent.requires_energy.length === 0 &&
    talent.requires_talents.length === 0
  const hasOnlyEnergy = (energy: string) => (talent: TalentData) =>
    hasEnergy(energy)(talent) &&
    talent.requires_classes.length === 0 &&
    talent.requires_talents.length === 0
  const hasClassAndEnergy = (classAndEnergy: string) => (talent: TalentData) => {
    const [className, energy] = classAndEnergy.split('_')
    return (
      hasClass(className)(talent) &&
      hasEnergy(energy)(talent) &&
      talent.requires_talents.length === 0
    )
  }

  const createTalentNodes = (predicate: (talent: TalentData) => boolean) =>
    sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents.filter(predicate).map((talent) => buildTalentNode(talent))
    )

  const createRequirementNodes = (
    requirements: string[],
    nodeType: TalentTreeRequirementNodeType,
    predicateMapper: (requirement: string) => (talent: TalentData) => boolean,
    filterMapper: (requirement: string) => RequirementFilterOption[],
    nameMapper?: (requirement: string) => string
  ): TalentTreeRequirementNode[] =>
    requirements.map((requirement) => ({
      type: nodeType,
      name: nameMapper?.(requirement) ?? requirement,
      requirementFilterOptions: filterMapper(requirement),
      children: createTalentNodes(predicateMapper(requirement)),
    }))

  const rootNoRequirementsNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.NO_REQUIREMENTS,
    name: 'No Requirements',
    requirementFilterOptions: [RequirementFilterOption.NoRequirements],
    children: createTalentNodes(isRootTalent),
  }

  const rootClassRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    Object.keys(REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP),
    TalentTreeNodeType.CLASS_REQUIREMENT,
    hasOnlyClass,
    getFilterOptionsForRequirement('class')
  )

  const rootClassAndEnergyRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    Object.keys(REQUIREMENT_CLASS_AND_ENERGY_TO_FILTER_OPTIONS_MAP),
    TalentTreeNodeType.CLASS_AND_ENERGY_REQUIREMENT,
    hasClassAndEnergy,
    getFilterOptionsForRequirement('classAndEnergy')
  )

  const rootEnergyRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    Object.keys(REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP),
    TalentTreeNodeType.ENERGY_REQUIREMENT,
    hasOnlyEnergy,
    getFilterOptionsForRequirement('energy')
  )

  const rootEventRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    uniqueEvents,
    TalentTreeNodeType.EVENT_REQUIREMENT,
    isValidEventTalent,
    () => [RequirementFilterOption.Event],
    // Special case, since these are basically the same event
    (name) => {
      if (name === 'Priest') return 'Prayer, Priest, Priest 1'
      if (name === 'The Deep Finish') return 'The Deep Finish, The Godscar Wastes Finish'
      return name
    }
  )

  const rootOfferNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.OFFER_REQUIREMENT,
    name: 'Offers',
    requirementFilterOptions: [RequirementFilterOption.Offer],
    children: createTalentNodes(isOffer),
  }

  return {
    noReqNode: rootNoRequirementsNode,
    classNodes: rootClassRequirementNodes,
    classAndEnergyNodes: rootClassAndEnergyRequirementNodes,
    energyNodes: rootEnergyRequirementNodes,
    eventNodes: rootEventRequirementNodes,
    offerNode: rootOfferNode,
  }
}

const removeDuplicateAndNonExistingTalents = (talents: TalentData[]): TalentData[] => {
  const seen = new Set<string>()

  return talents.filter((talent) => {
    if (seen.has(talent.name)) return false
    if (REMOVED_TALENTS.includes(talent.name)) return false

    seen.add(talent.name)
    return true
  })
}

const sortNodes = <T extends TalentTreeTalentNode | TalentTreeRequirementNode>(talents: T[]): T[] =>
  talents.sort((a, b) => {
    if (a.type === TalentTreeNodeType.TALENT && b.type === TalentTreeNodeType.TALENT) {
      return a.tier !== b.tier ? a.tier - b.tier : a.name.localeCompare(b.name)
    }
    return a.name.localeCompare(b.name)
  })

const getFilterOptionsForRequirement =
  (type: 'class' | 'energy' | 'classAndEnergy') => (requirement: string) => {
    let options = REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP[requirement]

    if (type === 'energy') {
      options = REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP[requirement]
    }

    if (type === 'classAndEnergy') {
      options = REQUIREMENT_CLASS_AND_ENERGY_TO_FILTER_OPTIONS_MAP[requirement]
    }

    if (options) return options

    throw new Error(
      `💀  Unknown requirement: ${type}, when mapping to filter option: ${requirement}`
    )
  }
