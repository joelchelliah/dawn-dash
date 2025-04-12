// Exact copy of CardData from src/codex/types/cards.ts
// Duplicated here because Supabase functions can't import from src/codex/types/cards.ts
export interface CardData {
  name: string
  description: string
  rarity: string
  type: string
  category: string
  expansion: string
  color: string
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
