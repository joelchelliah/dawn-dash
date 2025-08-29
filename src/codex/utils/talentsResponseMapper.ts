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
  REQUIREMENT_CLASS_TO_FILTER_OPTION_MAP,
  REQUIREMENT_ENERGY_TO_FILTER_OPTION_MAP,
} from '../constants/talentsMappingValues'

export const mapTalentsDataToTalentTree = (unparsedTalents: TalentData[]): TalentTree => {
  const correctedUnparsedTalents = unparsedTalents.map((talent) => ({
    ...talent,
    expansion: ACTUALLY_EVENT_ONLY_TALENTS.includes(talent.name) ? 0 : talent.expansion,
  }))
  const uniqueUnparsedTalents = removeDuplicateTalents(correctedUnparsedTalents)
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

    return {
      type: TalentTreeNodeType.TALENT,
      name: talent.name,
      description: talent.description,
      flavourText: talent.flavour_text,
      tier: talent.tier,
      expansion: talent.expansion,
      events: talent.events,
      children,
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

  const createTalentNodes = (predicate: (talent: TalentData) => boolean) =>
    sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents.filter(predicate).map((talent) => buildTalentNode(talent))
    )

  const createRequirementNodes = (
    requirements: string[],
    nodeType: TalentTreeRequirementNodeType,
    predicateMapper: (requirement: string) => (talent: TalentData) => boolean,
    filterMapper?: (requirement: string) => RequirementFilterOption,
    nameMapper?: (requirement: string) => string
  ): TalentTreeRequirementNode[] =>
    requirements.map((requirement) => ({
      type: nodeType,
      name: nameMapper?.(requirement) ?? requirement,
      requirementFilterOption: filterMapper?.(requirement),
      children: createTalentNodes(predicateMapper(requirement)),
    }))

  const rootNoRequirementsNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.NO_REQUIREMENTS,
    name: 'No Requirements',
    requirementFilterOption: RequirementFilterOption.NoRequirements,
    children: createTalentNodes(isRootTalent),
  }

  const rootClassRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    Object.keys(REQUIREMENT_CLASS_TO_FILTER_OPTION_MAP),
    TalentTreeNodeType.CLASS_REQUIREMENT,
    hasClass,
    getFilterOptionForRequirement('class')
  )

  const rootEnergyRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    Object.keys(REQUIREMENT_ENERGY_TO_FILTER_OPTION_MAP),
    TalentTreeNodeType.ENERGY_REQUIREMENT,
    hasEnergy,
    getFilterOptionForRequirement('energy')
  )

  const rootEventRequirementNodes: TalentTreeRequirementNode[] = createRequirementNodes(
    uniqueEvents,
    TalentTreeNodeType.EVENT_REQUIREMENT,
    isValidEventTalent,
    undefined,
    // Special case, since these are basically the same event
    (name) => (name === 'Priest' ? 'Prayer, Priest, Priest 1' : name)
  )

  const rootOfferNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.OFFER_REQUIREMENT,
    name: 'Offers',
    children: createTalentNodes(isOffer),
  }

  return {
    noReqNode: rootNoRequirementsNode,
    classNodes: rootClassRequirementNodes,
    energyNodes: rootEnergyRequirementNodes,
    eventNodes: rootEventRequirementNodes,
    offerNode: rootOfferNode,
  }
}

const removeDuplicateTalents = (talents: TalentData[]): TalentData[] => {
  const seen = new Set<string>()

  return talents.filter((talent) => {
    if (seen.has(talent.name)) return false
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

const getFilterOptionForRequirement = (type: 'class' | 'energy') => (requirement: string) => {
  const map =
    type === 'class'
      ? REQUIREMENT_CLASS_TO_FILTER_OPTION_MAP
      : REQUIREMENT_ENERGY_TO_FILTER_OPTION_MAP
  const option = map[requirement]

  if (option) return option

  throw new Error(`💀  Unknown requirement-${type}, when mapping to filter option: ${requirement}`)
}
