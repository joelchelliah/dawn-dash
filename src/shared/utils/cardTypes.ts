// Indexed by the game's card type id. 5 (Move) is never used in the game.
const CARD_TYPE_NAMES: Record<number, string> = {
  0: 'Melee',
  1: 'Magic',
  2: 'Ranged',
  3: 'Utility',
  4: 'Divine',
  6: 'Corruption',
  7: 'Monster',
}

const CARD_TYPE_EMOJIS: Record<number, string> = {
  0: '⚔️',
  1: '🔮',
  2: '🏹',
  3: '🛠️',
  4: '☀️',
  6: '🌙',
  7: '👹',
}

// Module-scope, so the references are stable and `ResultCard` stays memoizable
export const getCardTypeName = (index: number) => CARD_TYPE_NAMES[index] ?? ''
export const getCardTypeEmoji = (index: number) => CARD_TYPE_EMOJIS[index] ?? ''
