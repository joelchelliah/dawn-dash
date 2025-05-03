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

export type ParsedTalentData = {
  id: number
  name: string
  description: string
  flavourText: string
  tier: number
  expansion: number
  events: string[]
  requiresClasses: string[]
  requiresEnergy: string[]
  requiresTalents: ParsedTalentData[]
  requiredForTalents: ParsedTalentData[]
}
