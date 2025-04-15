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
