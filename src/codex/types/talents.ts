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
}

export enum TalentTreeNodeType {
  TALENT = 'TALENT',
  CLASS_REQUIREMENT = 'CLASS_REQUIREMENT',
  ENERGY_REQUIREMENT = 'ENERGY_REQUIREMENT',
  NO_REQUIREMENTS = 'NO_REQUIREMENTS',
}

export type TalentTreeRequirementNode = {
  type:
    | TalentTreeNodeType.CLASS_REQUIREMENT
    | TalentTreeNodeType.ENERGY_REQUIREMENT
    | TalentTreeNodeType.NO_REQUIREMENTS
  name: string
  children: TalentTreeTalentNode[]
}

export type TalentTreeTalentNode = {
  name: string
  type: TalentTreeNodeType.TALENT
  description: string
  flavourText: string
  tier: number
  expansion: number
  events: string[]
  children: TalentTreeTalentNode[]
}

export type TalentTree = {
  noReqNode: TalentTreeRequirementNode
  classNodes: TalentTreeRequirementNode[]
  energyNodes: TalentTreeRequirementNode[]
}

export type TalentTreeNode = TalentTreeTalentNode | TalentTreeRequirementNode
