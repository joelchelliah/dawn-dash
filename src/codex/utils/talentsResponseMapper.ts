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

// These are not events that give you a talent.
// The talents listed on them are just requirements for special dialogue options.
// So we need to filter them out of our requirements.
const EVENTS_BLACKLIST = [
  'Alchemist 1', // Stormscarred
  'ArmsDealer', // Devotion
  'Campfire', // Emporium Discount
  'GoldenIdol', // Mobility
  'LostSoul', // Devotion
  'Shrine of Trickery', // Faerytales
  'The Deep Finish', // Watched
  'The Godscar Wastes Start', // Watched
  'The Voice Below', // Watched
  'WallOfFire', // Fire Immunity

  // Manually merging these into Priest
  'Prayer',
  'Priest 1',
]

// These are actually talents you only get from events
const ACTUALLY_EVENT_TALENTS = ['Watched']

// These are not actually talents that can be obtained from Windy Hillock.
const NOT_REALLY_WINDY_HILLOCK_TALENTS = ['Grounding Weapon', 'Thundering Weapon', 'Devotion']

export const mapTalentsDataToTalentTree = (unparsedTalents: TalentData[]): TalentTree => {
  const correctedUnparsedTalents = unparsedTalents.map((talent) => ({
    ...talent,
    expansion: ACTUALLY_EVENT_TALENTS.includes(talent.name) ? 0 : talent.expansion,
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

  const isValidEventTalent = (eventName: string) => (talent: TalentData) =>
    talent.events.includes(eventName) &&
    (eventName === 'WindyHillock' ? !NOT_REALLY_WINDY_HILLOCK_TALENTS.includes(talent.name) : true)

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

  const rootEventRequirementNodes: TalentTreeRequirementNode[] = uniqueEvents.map((name) => ({
    type: TalentTreeNodeType.EVENT_REQUIREMENT,
    // Special case, since these are basically the same event
    name: name === 'Priest' ? 'Prayer, Priest, Priest 1' : name,
    children: sortNodes<TalentTreeTalentNode>(
      uniqueUnparsedTalents
        .filter(isValidEventTalent(name))
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
