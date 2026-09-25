export type CardData = {
  id: number
  name: string
  description: string
  rarity: number
  type: number
  category: number
  expansion: number
  color: number
  blightbane_id: number
  // Another card shares this name, so the name alone can't identify it (links, tracking)
  hasDuplicateName: boolean
}

export type CardApiResponse = Omit<CardData, 'blightbane_id' | 'hasDuplicateName'> & {
  id: number
  artwork: string
  tier: string
  hasEvents: boolean
}

export type CardsApiResponse = {
  card_len: number
  cards: Array<CardApiResponse>
}
