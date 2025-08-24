import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  TalentData,
  TalentTree,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '@/codex/types/talents'

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

  const rootOfferNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.OFFER_REQUIREMENT,
    name: 'Offers',
    children: sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents.filter(isOffer).map((talent) => buildTalentNode(talent))
    ),
  }

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

  const rootNoRequirementsNode: TalentTreeRequirementNode = {
    type: TalentTreeNodeType.NO_REQUIREMENTS,
    name: 'No Requirements',
    children: sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents.filter(isRootTalent).map((talent) => buildTalentNode(talent))
    ),
  }

  const rootClassRequirementNodes: TalentTreeRequirementNode[] = requirementClasses.map((name) => ({
    type: TalentTreeNodeType.CLASS_REQUIREMENT,
    name,
    children: sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents.filter(hasClass(name)).map((talent) => buildTalentNode(talent))
    ),
  }))

  const rootEnergyRequirementNodes: TalentTreeRequirementNode[] = requirementEnergies.map(
    (name) => ({
      type: TalentTreeNodeType.ENERGY_REQUIREMENT,
      name,
      children: sortNodes<TalentTreeTalentNode>(
        uniqueUnparsedTalents.filter(hasEnergy(name)).map((talent) => buildTalentNode(talent))
      ),
    })
  )

  return {
    offerNode: rootOfferNode,
    eventNodes: rootEventRequirementNodes,
    noReqNode: rootNoRequirementsNode,
    classNodes: rootClassRequirementNodes,
    energyNodes: rootEnergyRequirementNodes,
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

const requirementClasses = [
  'Arcanist',
  'Hunter',
  'Knight',
  'Rogue',
  'Seeker',
  'Warrior',
  'Sunforge',
]

const requirementEnergies = ['DEX', 'DEX2', 'INT', 'INT2', 'STR', 'STR2', 'STR3']

const UNIQUE_EVENTS_BLACKLIST = [
  'Campfire', // Emporium Discount
  'The Deep Finish', // Watched
  'The Godscar Wastes Start', // Watched
  'The Voice Below', // Watched
]
const ACTUALLY_UNIQUE_EVENT_TALENTS = ['Watched']
