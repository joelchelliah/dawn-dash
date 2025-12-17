import { RequirementFilterOption } from './filters'

export type TalentData = {
  id: number
  name: string
  description: string
  flavour_text: string
  tier: number
  expansion: number
  events: string[]
  requires_classes: string[]
  requires_energy: string[]
  requires_talents: number[]
  required_for_talents: number[]
  blightbane_id: number
  last_updated: string
  verified: boolean
}

export enum TalentTreeNodeType {
  TALENT = 'TALENT',
  EVENT = 'EVENT',
  CLASS_REQUIREMENT = 'CLASS_REQUIREMENT',
  ENERGY_REQUIREMENT = 'ENERGY_REQUIREMENT',
  NO_REQUIREMENTS = 'NO_REQUIREMENTS',
  OFFER_REQUIREMENT = 'OFFER_REQUIREMENT',
  EVENT_REQUIREMENT = 'EVENT_REQUIREMENT',
  CARD_REQUIREMENT = 'CARD_REQUIREMENT',
}

export type TalentTreeRequirementNodeType =
  | TalentTreeNodeType.CLASS_REQUIREMENT
  | TalentTreeNodeType.ENERGY_REQUIREMENT
  | TalentTreeNodeType.NO_REQUIREMENTS
  | TalentTreeNodeType.OFFER_REQUIREMENT
  | TalentTreeNodeType.EVENT_REQUIREMENT
  | TalentTreeNodeType.CARD_REQUIREMENT

export type TalentTreeRequirementNode = {
  type: TalentTreeRequirementNodeType
  name: string
  requirementFilterOptions: RequirementFilterOption[]
  children: TalentTreeTalentNode[]
}

export type TalentTreeTalentNode = {
  type: TalentTreeNodeType.TALENT
  name: string
  description: string
  flavourText: string
  tier: number
  expansion: number
  events: string[]
  children: TalentTreeTalentNode[]
  // Names of all descendants (children, grandchildren, etc.)
  descendants: string[]
  // To be able to check if node has additional requirements, not present in parent node.
  classOrEnergyRequirements: string[]
}

export type TalentTree = {
  noReqNode: TalentTreeRequirementNode
  classNodes: TalentTreeRequirementNode[]
  energyNodes: TalentTreeRequirementNode[]
  eventNodes: TalentTreeRequirementNode[]
  cardNodes: TalentTreeRequirementNode[]
  offerNode: TalentTreeRequirementNode
}

export type TalentTreeNode = TalentTreeTalentNode | TalentTreeRequirementNode

// Simplified recursive tree node for hierarchical rendering via d3.js
export interface HierarchicalTalentTreeNode {
  name: string
  description: string
  type?: TalentTreeNodeType
  tier?: number
  children?: HierarchicalTalentTreeNode[]
  // Currently only needed because we need a way to visualize that Goldstrike has 2 compulsory prerequisites.
  otherParentNames?: string[]
  // To be able to check if node has additional requirements, not present in parent node.
  classOrEnergyRequirements: string[]
}
