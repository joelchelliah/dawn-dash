import { CardData } from '@/codex/types/cards'

// Keyed lowercase so a hand-typed `<rarity:monster>` works too
const RARITY_INDEX_BY_NAME: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
  monster: 4,
}

// Case-sensitive on purpose: the game only reads a capitalized keyword as a rarity
export const RARITY_KEYWORDS = ['Monster', 'Common', 'Uncommon', 'Rare', 'Legendary']

const RARITY_TOKEN_PATTERN = /^<rarity:(\w+)>$/i

export const toRarityToken = (rarity: string) => `<rarity:${rarity}>`

export const isRarityToken = (keyword: string) => getRarityTokenIndex(keyword) !== undefined

const getRarityTokenIndex = (keyword: string): number | undefined => {
  const match = RARITY_TOKEN_PATTERN.exec(keyword)
  return match ? RARITY_INDEX_BY_NAME[match[1].toLowerCase()] : undefined
}

/**
 * A `<rarity:X>` token matches on the card's rarity, any other keyword on its name or description.
 * The token exists so the weekly optimization can express "every card of this rarity scores"
 * without a plain `Monster` keyword also pulling in cards that merely mention it.
 */
export const isCardMatchingKeyword = (
  { name, description, rarity }: CardData,
  keyword: string
): boolean => {
  const rarityIndex = getRarityTokenIndex(keyword)
  if (rarityIndex !== undefined) return rarity === rarityIndex

  const lowercasedKeyword = keyword.toLowerCase()
  return (
    name.toLowerCase().includes(lowercasedKeyword) ||
    description.toLowerCase().includes(lowercasedKeyword)
  )
}
