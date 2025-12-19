import { CardData } from '@/codex/types/cards'

import {
  hasMonsterExpansion,
  hasMonsterRarity,
  hasMonsterBanner,
  isNonCollectibleRegularCard,
  isNonCollectibleMonsterCard,
  isNonCollectible,
  parseCardDescription,
  containsNonCollectible,
} from './cardHelper'

describe('cardHelper', () => {
  describe('hasMonsterExpansion', () => {
    it('should return true only for expansion 0', () => {
      const testCases = [
        { expansion: 0, expected: true },
        { expansion: 1, expected: false },
        { expansion: 2, expected: false },
        { expansion: 3, expected: false },
        { expansion: 4, expected: false },
        { expansion: 5, expected: false },
      ]

      testCases.forEach(({ expansion, expected }) => {
        const card = mockCard({ expansion })
        expect(hasMonsterExpansion(card)).toBe(expected)
      })
    })
  })

  describe('hasMonsterRarity', () => {
    it('should return true only for rarity 4', () => {
      const testCases = [
        { rarity: 0, expected: false },
        { rarity: 1, expected: false },
        { rarity: 2, expected: false },
        { rarity: 3, expected: false },
        { rarity: 4, expected: true },
        { rarity: 5, expected: false },
      ]

      testCases.forEach(({ rarity, expected }) => {
        const card = mockCard({ rarity })
        expect(hasMonsterRarity(card)).toBe(expected)
      })
    })
  })

  describe('hasMonsterBanner', () => {
    it('should return true only for color 11', () => {
      const testCases = [
        { color: 0, expected: false },
        { color: 1, expected: false },
        { color: 2, expected: false },
        { color: 3, expected: false },
        { color: 4, expected: false },
        { color: 5, expected: false },
        { color: 10, expected: false },
        { color: 11, expected: true },
        { color: 12, expected: false },
      ]

      testCases.forEach(({ color, expected }) => {
        const card = mockCard({ color })
        expect(hasMonsterBanner(card)).toBe(expected)
      })
    })
  })

  describe('isNonCollectibleRegularCard', () => {
    it('should return true for cards with non-collectible categories', () => {
      ;[
        3, // Conjurations
        6, // Summons
        7, // Performances
        8, // Forms
        13, // Attunements
        16, // Ingredients
        19, // Offerings
      ].forEach((category) => {
        const card = mockCard({ category, expansion: 1 })
        expect(isNonCollectibleRegularCard(card)).toBe(true)
      })
    })

    it('should return true for non-collectible named cards', () => {
      ;[
        'Ascension I',
        'Hymn of Penance I',
        'The Dawnbringer',
        'Elite Lightning Bolt',
        'Imp Offer 1',
        'Battlespear C',
        'City of Gold',
        'Alignment',
        'Pirate Ink I',
        'Larceny INT',
      ].forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectibleRegularCard(card)).toBe(true)
      })
    })

    it('should be case insensitive for card names', () => {
      const card = mockCard({ name: 'THE DAWNBRINGER', expansion: 1 })

      expect(isNonCollectibleRegularCard(card)).toBe(true)
    })

    it('should return false for monster expansion cards', () => {
      const card = mockCard({ category: 3, expansion: 0 })

      expect(isNonCollectibleRegularCard(card)).toBe(false)
    })

    it('should return false for collectible regular cards', () => {
      const card = mockCard({ name: 'Regular Card', category: 2, expansion: 1 })

      expect(isNonCollectibleRegularCard(card)).toBe(false)
    })
  })

  describe('isNonCollectibleMonsterCard', () => {
    it('should return true for monster cards with non-collectible categories', () => {
      ;[
        1, // Items
        4, // Enchantments
        11, // Revelations
        12, // Affixes
        14, // Equipment effects
        17, // Paths II and III
      ].forEach((category) => {
        const card = mockCard({ category, expansion: 0 })
        expect(isNonCollectibleMonsterCard(card)).toBe(true)
      })
    })

    it('should return true for non-collectible named monster cards', () => {
      const card = mockCard({ name: 'Imp Offer 1', expansion: 0 })

      expect(isNonCollectibleMonsterCard(card)).toBe(true)
    })

    it('should return false for regular expansion cards', () => {
      const card = mockCard({ category: 1, expansion: 1 })

      expect(isNonCollectibleMonsterCard(card)).toBe(false)
    })

    it('should return false for collectible monster cards', () => {
      const card = mockCard({ name: 'Monster Card', category: 2, expansion: 0 })

      expect(isNonCollectibleMonsterCard(card)).toBe(false)
    })
  })

  describe('isNonCollectible', () => {
    it('should return true for non-collectible regular cards', () => {
      const card = mockCard({ category: 3, expansion: 1 })

      expect(isNonCollectible(card)).toBe(true)
    })

    it('should return true for non-collectible monster cards', () => {
      const card = mockCard({ category: 1, expansion: 0 })

      expect(isNonCollectible(card)).toBe(true)
    })

    it('should return false for collectible cards', () => {
      const card = mockCard({ name: 'Collectible Card', category: 2, expansion: 1 })

      expect(isNonCollectible(card)).toBe(false)
    })

    it('should return true for all non-collectible card names regardless of expansion', () => {
      ;[
        { name: 'Ascension III', expansion: 0 },
        { name: 'Hymn of Power II', expansion: 1 },
        { name: 'Elite Fireball', expansion: 2 },
        { name: 'Battlespear H', expansion: 3 },
        { name: 'Font of Youth', expansion: 0 },
        { name: 'Vexing Echo 1', expansion: 1 },
      ].forEach(({ name, expansion }) => {
        const card = mockCard({ name, expansion })
        expect(isNonCollectible(card)).toBe(true)
      })
    })
  })

  describe('parseCardDescription', () => {
    describe('basic formatting', () => {
      it('should normalize <br> tags', () => {
        const result = parseCardDescription('Line 1<br>Line 2<br/>Line 3')

        expect(result).toContain('<br />')
        expect(result).not.toContain('<br>')
      })

      it('should replace all bracket and parenthesis patterns correctly', () => {
        ;[
          { input: '[[Bracketed]]', expected: '[Bracketed]' },
          { input: '([Test])', expected: '(Test)' },
          { input: '({Test})', expected: '(Test)' },
          { input: '[Test])', expected: '[Test)' },
          { input: '{Test})', expected: '{Test)' },
        ].forEach(({ input, expected }) => {
          const result = parseCardDescription(input)
          expect(result).toBe(expected)
        })
      })

      it('should trim whitespace', () => {
        const result = parseCardDescription('  Text with spaces  ')

        expect(result).toBe('Text with spaces')
      })

      it('should handle multiple replacements at once', () => {
        const result = parseCardDescription('[[Text]]<br>More<br/>([Content])')

        expect(result).toContain('[Text]')
        expect(result).toContain('<br />')
        expect(result).toContain('(Content)')
      })
    })

    describe('without icon class', () => {
      it('should not replace keywords when no icon class provided', () => {
        const result = parseCardDescription('Gain 5 HEALTH and 3 STR')

        expect(result).toBe('Gain 5 HEALTH and 3 STR')
        expect(result).not.toContain('<img')
      })

      it('should only apply basic formatting without icons', () => {
        const result = parseCardDescription('[[HEALTH]] <br> STR')

        expect(result).toBe('[HEALTH] <br /> STR')
        expect(result).not.toContain('<img')
      })
    })

    describe('with icon class', () => {
      const iconClass = 'test-icon'

      it('should replace multiple keywords in one description', () => {
        const result = parseCardDescription('Gain 5 HEALTH, 3 STR, and 2 INT', iconClass)

        expect(result).toContain('alt="HEALTH"')
        expect(result).toContain('alt="STR"')
        expect(result).toContain('alt="INT"')
        const imgCount = (result.match(/<img/g) || []).length
        expect(imgCount).toBe(3)
      })

      it('should replace all occurrences of the same keyword', () => {
        const result = parseCardDescription('STR gives more STR', iconClass)

        const strCount = (result.match(/alt="STR"/g) || []).length
        expect(strCount).toBe(2)
      })

      it('should handle keywords with brackets and formatting', () => {
        const result = parseCardDescription('[[HEALTH]]<br>More STR', iconClass)

        expect(result).toContain('[<img')
        expect(result).toContain('alt="HEALTH"')
        expect(result).toContain('alt="STR"')
        expect(result).toContain('<br />')
      })

      it('should preserve text between keywords', () => {
        const result = parseCardDescription('Gain HEALTH and lose STR', iconClass)

        expect(result).toContain('Gain')
        expect(result).toContain('and lose')
      })

      it('should trim result even with icons', () => {
        const result = parseCardDescription('  HEALTH  ', iconClass)

        expect(result.startsWith('  ')).toBe(false)
        expect(result.endsWith('  ')).toBe(false)
      })
    })
  })

  describe('containsNonCollectible', () => {
    it('should return true if any card is non-collectible', () => {
      const cards: CardData[] = [
        mockCard({ name: 'Regular Card', category: 2, expansion: 1 }),
        mockCard({ name: 'Another Regular', category: 2, expansion: 1 }),
        mockCard({ name: 'Ascension I', category: 2, expansion: 1 }), // Non-collectible
      ]

      expect(containsNonCollectible(cards)).toBe(true)
    })

    it('should return false if all cards are collectible', () => {
      const cards: CardData[] = [
        mockCard({ name: 'Regular Card 1', category: 2, expansion: 1 }),
        mockCard({ name: 'Regular Card 2', category: 2, expansion: 1 }),
        mockCard({ name: 'Regular Card 3', category: 2, expansion: 1 }),
      ]

      expect(containsNonCollectible(cards)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(containsNonCollectible([])).toBe(false)
    })

    it('should return true for non-collectible category', () => {
      const cards: CardData[] = [
        mockCard({ category: 3, expansion: 1 }), // Conjuration
      ]

      expect(containsNonCollectible(cards)).toBe(true)
    })

    it('should return true for non-collectible monster card', () => {
      const cards: CardData[] = [
        mockCard({ name: 'Regular', expansion: 1 }),
        mockCard({ category: 1, expansion: 0 }), // Monster non-collectible
      ]

      expect(containsNonCollectible(cards)).toBe(true)
    })
  })

  describe('comprehensive non-collectible card tests', () => {
    it('should identify all Ascension cards as non-collectible', () => {
      const ascensionCards = ['Ascension I', 'Ascension II', 'Ascension III']

      ascensionCards.forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })

    it('should identify all Hymn cards as non-collectible', () => {
      const hymnCards = [
        'Hymn of Penance I',
        'Hymn of Penance II',
        'Hymn of Penance III',
        'Hymn of Power I',
        'Hymn of Power II',
        'Hymn of Power III',
        'Hymn of Vitality I',
        'Hymn of Vitality II',
        'Hymn of Vitality III',
        'Hymn of Light I',
        'Hymn of Light II',
        'Hymn of Light III',
      ]

      hymnCards.forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })

    it('should identify all Elite spell cards as non-collectible', () => {
      ;['Elite Lightning Bolt', 'Elite Fireball', 'Elite Frostbolt'].forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })

    it('should identify all Imp Offer cards as non-collectible', () => {
      ;[
        'Imp Offer 1',
        'Imp Offer 2',
        'Imp Offer 3',
        'Imp Offer 4',
        'Imp Offer 5',
        'Imp Offer 6',
        'Offer of Doom',
      ].forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })

    it('should identify all Battlespear cards as non-collectible', () => {
      ;[
        'Battlespear C',
        'Battlespear D',
        'Battlespear E',
        'Battlespear H',
        'Battlespear L',
        'Battlespear U',
      ].forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })

    it('should identify all location cards as non-collectible', () => {
      const locations = ['City of Gold', 'Font of Youth', 'Sunken Forge', 'Wasteland']

      locations.forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })

    it('should identify all Pirate Ink cards as non-collectible', () => {
      ;['Pirate Ink I', 'Pirate Ink II', 'Pirate Ink III'].forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })

    it('should identify all Larceny cards as non-collectible', () => {
      const larcenyCards = ['Larceny INT', 'Larceny STR', 'Larceny DEX', 'Larceny HOLY']

      larcenyCards.forEach((name) => {
        const card = mockCard({ name, expansion: 1 })
        expect(isNonCollectible(card)).toBe(true)
      })
    })
  })
})

// Mock helper function

function mockCard(overrides: Partial<CardData> = {}): CardData {
  return {
    id: 1,
    name: 'Mock Card',
    description: 'Mock description',
    rarity: 1,
    type: 1,
    category: 2,
    expansion: 1,
    color: 0,
    blightbane_id: 1,
    ...overrides,
  }
}
