import { CardData } from '@/shared/types/cards'
import { isNonCollectible } from '@/shared/utils/cardHelper'
import { parseCardDescription } from '@/shared/utils/cardDescription'

import { getCardColorAndRarity } from './transmuteLookup'

const MAX_SUGGESTIONS = 5

// Cards the data knows and a player can keep in their deck (see "Which cards count as sources")
export const getSearchableCards = (cards: CardData[]) =>
  cards
    .filter((card) => getCardColorAndRarity(card.blightbane_id) && !isNonCollectible(card))
    .sort((a, b) => a.name.localeCompare(b.name))

// Prefix matches first, then the rest. `cards` is pre-sorted by name, so each half stays alphabetical.
export const findCardSuggestions = (cards: CardData[], query: string) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  const prefixMatches: CardData[] = []
  const otherMatches: CardData[] = []
  for (const card of cards) {
    const index = card.name.toLowerCase().indexOf(normalized)
    if (index === 0) prefixMatches.push(card)
    else if (index > 0) otherMatches.push(card)
  }

  return [...prefixMatches, ...otherMatches].slice(0, MAX_SUGGESTIONS)
}

/*
 * Tells same-named cards apart. Banner and rarity aren't enough: 9 of the 18 twin pairs share both
 * (the Whirlpools among them), so the description's opening is shown instead.
 */
export const getTwinHint = (card: CardData) =>
  parseCardDescription(card.description)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
