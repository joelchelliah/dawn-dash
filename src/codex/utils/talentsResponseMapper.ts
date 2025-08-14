import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  TalentData,
  TalentTree,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '@/codex/types/talents'

export const mapTalentsDataToTalentTree = (unparsedTalents: TalentData[]): TalentTree => {
  const uniqueUnparsedTalents = removeDuplicateTalents(unparsedTalents)
  const idToUnparsedTalent = new Map<number, TalentData>()

  uniqueUnparsedTalents.forEach((talent) => {
    idToUnparsedTalent.set(talent.blightbane_id, talent)
  })

  function buildTalentNode(talent: TalentData, visited = new Set<number>()): TalentTreeTalentNode {
    if (visited.has(talent.blightbane_id)) {
      throw new Error(`Failed to parse talent: ${talent.name} (Recursive loop detected!)`)
    }

    visited.add(talent.blightbane_id)

    const children = (talent.required_for_talents || [])
      .map((id) => idToUnparsedTalent.get(id))
      .filter(isNotNullOrUndefined)
      .map((child) => buildTalentNode(child, new Set(visited)))

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

  const isRootTalent = (talent: TalentData) =>
    talent.requires_talents.length === 0 &&
    talent.requires_classes.length === 0 &&
    talent.requires_energy.length === 0

  const hasClass = (className: string) => (talent: TalentData) =>
    talent.requires_classes.includes(className)
  const hasEnergy = (energy: string) => (talent: TalentData) =>
    talent.requires_energy.includes(energy)

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
    noReqNode: rootNoRequirementsNode,
    classNodes: rootClassRequirementNodes,
    energyNodes: rootEnergyRequirementNodes,
  }
}

const removeDuplicateTalents = (talents: TalentData[]) =>
  talents.filter(
    (talent, index, self) => index === self.findIndex(({ name }) => name === talent.name)
  )

const sortNodes = <T extends TalentTreeTalentNode | TalentTreeRequirementNode>(talents: T[]): T[] =>
  talents.sort((a, b) => {
    if (a.type === TalentTreeNodeType.TALENT && b.type === TalentTreeNodeType.TALENT) {
      if (a.tier !== b.tier) return a.tier - b.tier

      return a.name.localeCompare(b.name)
    } else {
      return a.name.localeCompare(b.name)
    }
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
