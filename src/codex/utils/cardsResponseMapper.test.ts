import { CardApiResponse, CardData } from '@/codex/types/cards'

import { mapAndSortCardsResponse, mapAndSortCardsData } from './cardsResponseMapper'

describe('cardsResponseMapper', () => {
  describe('mapAndSortCardsResponse', () => {
    it('should map API response cards to CardData with blightbane_id', () => {
      const apiCards: CardApiResponse[] = [
        mockCardApiResponse({
          id: 123,
          name: 'Test Card',
          expansion: 1,
        }),
      ]

      const result = mapAndSortCardsResponse(apiCards)

      expect(result).toHaveLength(1)
      expect(result[0].blightbane_id).toBe(123)
      expect(result[0].name).toBe('Test Card')
    })

    it('should sort cards by color, then rarity (descending), then name', () => {
      const apiCards: CardApiResponse[] = [
        mockCardApiResponse({ name: 'Zebra', color: 1, rarity: 1 }),
        mockCardApiResponse({ name: 'Alpha', color: 1, rarity: 1 }),
        mockCardApiResponse({ name: 'Beta', color: 1, rarity: 2 }),
        mockCardApiResponse({ name: 'Gamma', color: 0, rarity: 1 }),
      ]

      const result = mapAndSortCardsResponse(apiCards)

      // First by color (0 before 1)
      expect(result[0].name).toBe('Gamma')
      // Then within same color, by rarity descending (2 before 1)
      expect(result[1].name).toBe('Beta')
      // Then within same color and rarity, alphabetically
      expect(result[2].name).toBe('Alpha')
      expect(result[3].name).toBe('Zebra')
    })

    it('should remove duplicate cards by name', () => {
      const apiCards: CardApiResponse[] = [
        mockCardApiResponse({ id: 1, name: 'Duplicate Card', color: 0 }),
        mockCardApiResponse({ id: 2, name: 'Unique Card', color: 0 }),
        mockCardApiResponse({ id: 3, name: 'Duplicate Card', color: 0 }),
      ]

      const result = mapAndSortCardsResponse(apiCards)

      expect(result).toHaveLength(2)
      expect(result.map((c) => c.name)).toEqual(['Duplicate Card', 'Unique Card'])
      // Should keep the first occurrence
      expect(result.find((c) => c.name === 'Duplicate Card')?.blightbane_id).toBe(1)
    })

    it('should remove deprecated cards', () => {
      const apiCards: CardApiResponse[] = [
        mockCardApiResponse({ name: 'Good Card' }),
        mockCardApiResponse({ name: 'Cutlass_OLD' }),
        mockCardApiResponse({ name: 'Another Good Card' }),
      ]

      const result = mapAndSortCardsResponse(apiCards)

      expect(result).toHaveLength(2)
      expect(result.map((c) => c.name)).not.toContain('Cutlass_OLD')
    })

    describe('expansion mapping', () => {
      it('should remap ACTUALLY_CORE_CARDS to expansion 1', () => {
        const coreCards = [
          'Elite Prayer',
          'Monolith',
          'Antimage Bomb',
          'Big Bomb',
          'Concussive Bomb',
          'Soulfire Bomb',
          'Cryo Bomb',
        ]

        coreCards.forEach((cardName) => {
          const apiCards: CardApiResponse[] = [
            mockCardApiResponse({ name: cardName, expansion: 5 }),
          ]

          const result = mapAndSortCardsResponse(apiCards)

          expect(result[0].expansion).toBe(1)
        })
      })

      it('should remap ACTUALLY_ECLYPSE_CARDS to expansion 7', () => {
        const eclypseCards = [
          'Battlespear C',
          'Battlespear D',
          'Battlespear E',
          'Battlespear H',
          'Battlespear L',
          'Battlespear U',
          'Map of Forms',
          'Map of Hues',
          'Map of Power',
          'Map of Riches',
        ]

        eclypseCards.forEach((cardName) => {
          const apiCards: CardApiResponse[] = [
            mockCardApiResponse({ name: cardName, expansion: 2 }),
          ]

          const result = mapAndSortCardsResponse(apiCards)

          expect(result[0].expansion).toBe(7)
        })
      })

      it('should remap ACTUALLY_MONSTER_CARDS to expansion 0', () => {
        const monsterCards = ["Typhon's Cunning II", "Typhon's Cunning III"]

        monsterCards.forEach((cardName) => {
          const apiCards: CardApiResponse[] = [
            mockCardApiResponse({ name: cardName, expansion: 3 }),
          ]

          const result = mapAndSortCardsResponse(apiCards)

          expect(result[0].expansion).toBe(0)
        })
      })

      it('should keep original expansion for unmapped cards', () => {
        const apiCards: CardApiResponse[] = [
          mockCardApiResponse({ name: 'Regular Card', expansion: 4 }),
        ]

        const result = mapAndSortCardsResponse(apiCards)

        expect(result[0].expansion).toBe(4)
      })
    })

    it('should handle empty array', () => {
      const result = mapAndSortCardsResponse([])

      expect(result).toEqual([])
    })

    it('should handle complex scenario with all features', () => {
      const apiCards: CardApiResponse[] = [
        mockCardApiResponse({ id: 1, name: 'Zebra', color: 2, rarity: 1, expansion: 3 }),
        mockCardApiResponse({ id: 2, name: 'Elite Prayer', color: 1, rarity: 2, expansion: 5 }),
        mockCardApiResponse({ id: 3, name: 'Cutlass_OLD', color: 0, rarity: 1, expansion: 1 }),
        mockCardApiResponse({ id: 4, name: 'Alpha', color: 2, rarity: 1, expansion: 3 }),
        mockCardApiResponse({ id: 5, name: 'Zebra', color: 2, rarity: 1, expansion: 3 }),
      ]

      const result = mapAndSortCardsResponse(apiCards)

      // Should remove deprecated and duplicate
      expect(result).toHaveLength(3)
      expect(result.map((c) => c.name)).not.toContain('Cutlass_OLD')

      // Should remap Elite Prayer to expansion 1
      const elitePrayer = result.find((c) => c.name === 'Elite Prayer')
      expect(elitePrayer?.expansion).toBe(1)

      // Should be sorted by color first
      expect(result[0].color).toBeLessThanOrEqual(result[1].color)
      expect(result[1].color).toBeLessThanOrEqual(result[2].color)
    })
  })

  describe('mapAndSortCardsData', () => {
    it('should process CardData without adding blightbane_id', () => {
      const cards: CardData[] = [
        mockCardData({
          id: 1,
          blightbane_id: 123,
          name: 'Test Card',
          expansion: 1,
        }),
      ]

      const result = mapAndSortCardsData(cards)

      expect(result).toHaveLength(1)
      expect(result[0].blightbane_id).toBe(123) // Should remain unchanged
      expect(result[0].name).toBe('Test Card')
    })

    it('should sort cards by color, then rarity (descending), then name', () => {
      const cards: CardData[] = [
        mockCardData({ name: 'Zebra', color: 1, rarity: 1 }),
        mockCardData({ name: 'Alpha', color: 1, rarity: 1 }),
        mockCardData({ name: 'Beta', color: 1, rarity: 2 }),
        mockCardData({ name: 'Gamma', color: 0, rarity: 1 }),
      ]

      const result = mapAndSortCardsData(cards)

      expect(result[0].name).toBe('Gamma')
      expect(result[1].name).toBe('Beta')
      expect(result[2].name).toBe('Alpha')
      expect(result[3].name).toBe('Zebra')
    })

    it('should remove duplicate cards by name', () => {
      const cards: CardData[] = [
        mockCardData({ id: 1, name: 'Duplicate Card', color: 0 }),
        mockCardData({ id: 2, name: 'Unique Card', color: 0 }),
        mockCardData({ id: 3, name: 'Duplicate Card', color: 0 }),
      ]

      const result = mapAndSortCardsData(cards)

      expect(result).toHaveLength(2)
      expect(result.map((c) => c.name)).toEqual(['Duplicate Card', 'Unique Card'])
    })

    it('should remove deprecated cards', () => {
      const cards: CardData[] = [
        mockCardData({ name: 'Good Card' }),
        mockCardData({ name: 'Cutlass_OLD' }),
        mockCardData({ name: 'Another Good Card' }),
      ]

      const result = mapAndSortCardsData(cards)

      expect(result).toHaveLength(2)
      expect(result.map((c) => c.name)).not.toContain('Cutlass_OLD')
    })

    it('should remap expansions for special cards', () => {
      const cards: CardData[] = [
        mockCardData({ name: 'Elite Prayer', expansion: 5 }),
        mockCardData({ name: 'Battlespear C', expansion: 2 }),
        mockCardData({ name: "Typhon's Cunning II", expansion: 3 }),
      ]

      const result = mapAndSortCardsData(cards)

      const elitePrayer = result.find((c) => c.name === 'Elite Prayer')
      const battlespear = result.find((c) => c.name === 'Battlespear C')
      const typhon = result.find((c) => c.name === "Typhon's Cunning II")

      expect(elitePrayer?.expansion).toBe(1)
      expect(battlespear?.expansion).toBe(7)
      expect(typhon?.expansion).toBe(0)
    })

    it('should handle empty array', () => {
      const result = mapAndSortCardsData([])

      expect(result).toEqual([])
    })
  })
})

// Mock helper functions

function mockCardApiResponse(overrides: Partial<CardApiResponse> = {}): CardApiResponse {
  return {
    id: 1,
    name: 'Mock Card',
    description: 'Mock description',
    rarity: 1,
    type: 1,
    category: 1,
    expansion: 1,
    color: 0,
    artwork: 'mock-artwork.png',
    tier: 'common',
    hasEvents: false,
    ...overrides,
  }
}

function mockCardData(overrides: Partial<CardData> = {}): CardData {
  return {
    id: 1,
    name: 'Mock Card',
    description: 'Mock description',
    rarity: 1,
    type: 1,
    category: 1,
    expansion: 1,
    color: 0,
    blightbane_id: 1,
    ...overrides,
  }
}
