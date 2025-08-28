import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  TalentData,
  TalentTree,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '@/codex/types/talents'

import { RequirementFilterOption } from '../types/filters'

const REQUIREMENT_CLASSES = [
  'Arcanist',
  'Hunter',
  'Knight',
  'Rogue',
  'Seeker',
  'Warrior',
  'Sunforge',
]

const REQUIREMENT_ENERGIES = ['DEX', 'DEX2', 'INT', 'INT2', 'STR', 'STR2', 'STR3']

const UNIQUE_EVENTS_BLACKLIST = [
  'Campfire', // Emporium Discount
  'The Deep Finish', // Watched
  'The Godscar Wastes Start', // Watched
  'The Voice Below', // Watched
]
const ACTUALLY_UNIQUE_EVENT_TALENTS = ['Watched']

export const mapTalentsDataToTalentTree = (unparsedTalents: TalentData[]): TalentTree => {
  const correctedUnparsedTalents = unparsedTalents.map((talent) => ({
    ...talent,
    expansion: ACTUALLY_UNIQUE_EVENT_TALENTS.includes(talent.name) ? 0 : talent.expansion,
  }))
  const uniqueUnparsedTalents = removeDuplicateTalents(correctedUnparsedTalents)
  const idToUnparsedTalent = new Map(
    uniqueUnparsedTalents.map((talent) => [talent.blightbane_id, talent])
  )
  const uniqueEventsForEventOnlyTalents = Array.from(
    new Set(
      uniqueUnparsedTalents
        .filter((talent) => talent.expansion === 0)
        .flatMap((talent) => talent.events)
        .filter((event) => !UNIQUE_EVENTS_BLACKLIST.includes(event))
    )
  ).sort()

  function buildTalentNode(talent: TalentData, visited = new Set<number>()): TalentTreeTalentNode {
    if (visited.has(talent.blightbane_id)) {
      throw new Error(`Failed to parse talent: ${talent.name} (Recursive loop detected!)`)
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

  const isUniqueToAnEvent = (eventName: string) => (talent: TalentData) =>
    talent.expansion === 0 && talent.events.includes(eventName)

  const isRootTalent = (talent: TalentData) =>
    talent.requires_talents.length === 0 &&
    talent.requires_classes.length === 0 &&
    talent.requires_energy.length === 0 &&
    talent.expansion !== 0

  const hasClass = (className: string) => (talent: TalentData) =>
    talent.requires_classes.includes(className)
  const hasEnergy = (energy: string) => (talent: TalentData) =>
    talent.requires_energy.includes(energy)

  const rootNoRequirementsNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.NO_REQUIREMENTS,
    name: 'No Requirements',
    requirementFilterOption: RequirementFilterOption.NoRequirements,
    children: sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents.filter(isRootTalent).map((talent) => buildTalentNode(talent, new Set()))
    ),
  }

  const rootClassRequirementNodes: TalentTreeRequirementNode[] = REQUIREMENT_CLASSES.map(
    (name) => ({
      type: TalentTreeNodeType.CLASS_REQUIREMENT,
      name,
      requirementFilterOption: requirementClassToFilterOption(name),
      children: sortNodes<TalentTreeTalentNode>(
        uniqueUnparsedTalents.filter(hasClass(name)).map((talent) => buildTalentNode(talent))
      ),
    })
  )

  const rootEnergyRequirementNodes: TalentTreeRequirementNode[] = REQUIREMENT_ENERGIES.map(
    (name) => ({
      type: TalentTreeNodeType.ENERGY_REQUIREMENT,
      name,
      requirementFilterOption: requirementEnergyToFilterOption(name),
      children: sortNodes<TalentTreeTalentNode>(
        uniqueUnparsedTalents.filter(hasEnergy(name)).map((talent) => buildTalentNode(talent))
      ),
    })
  )

  const rootEventRequirementNodes: TalentTreeRequirementNode[] =
    uniqueEventsForEventOnlyTalents.map((name) => ({
      type: TalentTreeNodeType.EVENT_REQUIREMENT,
      name,
      children: sortNodes<TalentTreeTalentNode>(
        uniqueUnparsedTalents
          .filter(isUniqueToAnEvent(name))
          .map((talent) => buildTalentNode(talent))
      ),
    }))

  const rootOfferNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.OFFER_REQUIREMENT,
    name: 'Offers',
    children: sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents.filter(isOffer).map((talent) => buildTalentNode(talent))
    ),
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

const requirementClassToFilterOption = (className: string) => {
  switch (className) {
    case 'Arcanist':
      return RequirementFilterOption.Arcanist
    case 'Hunter':
      return RequirementFilterOption.Hunter
    case 'Knight':
      return RequirementFilterOption.Knight
    case 'Rogue':
      return RequirementFilterOption.Rogue
    case 'Seeker':
      return RequirementFilterOption.Seeker
    case 'Warrior':
      return RequirementFilterOption.Warrior
    case 'Sunforge':
      return RequirementFilterOption.Sunforge
    default:
      throw new Error(`Unknown requirement class: ${className}`)
  }
}

const requirementEnergyToFilterOption = (energy: string) => {
  switch (energy) {
    case 'DEX':
    case 'DEX2':
      return RequirementFilterOption.Dexterity
    case 'INT':
    case 'INT2':
      return RequirementFilterOption.Intelligence
    case 'STR':
    case 'STR2':
    case 'STR3':
      return RequirementFilterOption.Strength
    default:
      throw new Error(`Unknown requirement energy: ${energy}`)
  }
}
