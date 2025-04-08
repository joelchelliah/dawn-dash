export type CardData = {
  name: string
  description: string
  rarity: number
  type: number
  category: number
  expansion: number
  color: number
}

export type CardsApiResponse = {
  card_len: number
  cards: Array<
    CardData & {
      id: number
      artwork: string
      tier: string
      hasEvents: boolean
    }
  >
}
