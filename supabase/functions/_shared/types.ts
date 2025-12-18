// Exact copy of CardData from src/codex/types/cards.ts
// Duplicated here because Supabase functions can't import from there
export interface CardData {
  name: string
  description: string
  rarity: number
  type: number
  category: number
  expansion: number
  color: number
  blightbane_id: number
}

export type CardsApiResponse = {
  card_len: number
  cards: Array<
    Omit<CardData, 'blightbane_id'> & {
      id: number
      artwork: string
      tier: string
      hasEvents: boolean
    }
  >
}

// Exact copy of TalentData from src/codex/types/talents.ts
// Duplicated here because Supabase functions can't import from there
export interface TalentData {
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
  event_requirement_matrix: string[][]
  blightbane_id: number
  last_updated: string
  verified: boolean
}

export type TalentsApiResponse = {
  card_len: number
  cards: Array<
    Omit<
      TalentData,
      | 'flavour_text'
      | 'events'
      | 'requires_classes'
      | 'requires_energy'
      | 'requires_talents'
      | 'required_for_talents'
      | 'blightbane_id'
    > & {
      id: number
      rarity: number
      hasEvents: boolean
    }
  >
}

export type TalentApiResponse = Omit<
  TalentData,
  | 'flavour_text'
  | 'requires_classes'
  | 'requires_energy'
  | 'requires_talents'
  | 'required_for_talents'
  | 'blightbane_id'
> & {
  id: number
  version: string
  prereq: (number | string)[]
  ispreq: (number | string)[]
  flavortext: string | null
}
