import { TalentData } from '../types/talents'

import {
  removeDuplicateAndNonExistingTalents,
  splitTalentsThatHaveMultipleClassesAndOtherRequirements,
  getFilterOptionsForRequirement,
} from './talentDataHelper'

describe('talentDataHelper', () => {
  describe('removeDuplicateAndNonExistingTalents', () => {
    it('should remove duplicate talents based on name', () => {
      const talents: TalentData[] = [
        mockTalent({ id: 1, name: 'Fireball' }),
        mockTalent({ id: 2, name: 'Ice Blast' }),
        mockTalent({ id: 3, name: 'Fireball' }), // Duplicate
      ]

      const result = removeDuplicateAndNonExistingTalents(talents)

      expect(result).toHaveLength(2)
      expect(result.map((t) => t.name)).toEqual(['Fireball', 'Ice Blast'])
    })

    it('should remove talents that are in the REMOVED_TALENTS list', () => {
      const talents: TalentData[] = [
        mockTalent({ id: 1, name: 'Fireball' }),
        mockTalent({ id: 2, name: 'Prodigy' }), // Removed
        mockTalent({ id: 3, name: 'Lucky' }), // Removed
        mockTalent({ id: 4, name: "Alcars' Rage" }), // Removed
        mockTalent({ id: 5, name: 'Ice Blast' }),
      ]

      const result = removeDuplicateAndNonExistingTalents(talents)

      expect(result).toHaveLength(2)
      expect(result.map((t) => t.name)).toEqual(['Fireball', 'Ice Blast'])
    })
  })

  describe('splitTalentsThatHaveMultipleClassesAndOtherRequirements', () => {
    it('should split talent with multiple classes AND talent requirements', () => {
      const talents: TalentData[] = [
        mockTalent({
          id: 1,
          name: 'Haemorrhager',
          requires_classes: ['Warrior', 'Hunter'],
          requires_talents: [10, 20],
          requires_energy: [],
        }),
      ]

      const result = splitTalentsThatHaveMultipleClassesAndOtherRequirements(talents)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Haemorrhager')
      expect(result[0].requires_classes).toEqual(['Warrior'])
      expect(result[0].requires_talents).toEqual([10, 20])
      expect(result[1].name).toBe('Haemorrhager')
      expect(result[1].requires_classes).toEqual(['Hunter'])
      expect(result[1].requires_talents).toEqual([10, 20])
    })

    it('should split talent with multiple classes AND energy requirements', () => {
      const talents: TalentData[] = [
        mockTalent({
          id: 1,
          name: 'Haemorrhager',
          requires_classes: ['Warrior', 'Hunter'],
          requires_talents: [],
          requires_energy: ['STR'],
        }),
      ]

      const result = splitTalentsThatHaveMultipleClassesAndOtherRequirements(talents)

      expect(result).toHaveLength(2)
      expect(result[0].requires_classes).toEqual(['Warrior'])
      expect(result[0].requires_energy).toEqual(['STR'])
      expect(result[1].requires_classes).toEqual(['Hunter'])
      expect(result[1].requires_energy).toEqual(['STR'])
    })

    it('should NOT split talent with multiple classes but NO other requirements', () => {
      const talents: TalentData[] = [
        mockTalent({
          id: 1,
          name: 'Multi-Class Talent',
          requires_classes: ['Warrior', 'Rogue', 'Knight'],
          requires_talents: [],
          requires_energy: [],
        }),
      ]

      const result = splitTalentsThatHaveMultipleClassesAndOtherRequirements(talents)

      expect(result).toHaveLength(1)
      expect(result[0].requires_classes).toEqual(['Warrior', 'Rogue', 'Knight'])
    })

    it('should NOT split talent with single class even with other requirements', () => {
      const talents: TalentData[] = [
        mockTalent({
          id: 1,
          name: 'Single Class Talent',
          requires_classes: ['Warrior'],
          requires_talents: [10, 20],
          requires_energy: ['STR'],
        }),
      ]

      const result = splitTalentsThatHaveMultipleClassesAndOtherRequirements(talents)

      expect(result).toHaveLength(1)
      expect(result[0].requires_classes).toEqual(['Warrior'])
      expect(result[0].requires_talents).toEqual([10, 20])
      expect(result[0].requires_energy).toEqual(['STR'])
    })
  })

  describe('getFilterOptionsForRequirement', () => {
    it('should return correct filter options for all class types', () => {
      const classNames = ['Arcanist', 'Hunter', 'Knight', 'Rogue', 'Seeker', 'Warrior', 'Sunforge']

      classNames.forEach((className) => {
        const result = getFilterOptionsForRequirement('class', className)
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
      })
    })

    it('should return correct filter options for all energy types', () => {
      const energyTypes = [
        'DEX',
        'DEX2',
        'INT',
        'INT2',
        'STR',
        'STR2',
        'STR3',
        'INTSTR',
        'DEXSTR',
        'DEXINT',
      ]

      energyTypes.forEach((energyType) => {
        const result = getFilterOptionsForRequirement('energy', energyType)
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
      })
    })
  })
})

function mockTalent(overrides: Partial<TalentData> = {}): TalentData {
  return {
    id: 1,
    name: 'Mock Talent',
    description: 'Mock description',
    flavour_text: 'Mock flavour',
    tier: 1,
    expansion: 0,
    events: [],
    requires_classes: [],
    requires_energy: [],
    requires_talents: [],
    required_for_talents: [],
    blightbane_id: 1,
    last_updated: '2024-01-01',
    verified: true,
    ...overrides,
  }
}
