import { TalentData } from '../types/talents'

import {
  getClassOrEnergyRequirements,
  getFilterOptionsForRequirement,
  removeDuplicateAndNonExistingTalents,
  splitTalentsThatHaveMultipleSetsOfEventRequirements,
  splitTalentsThatHaveMultipleClassesAndOtherRequirements,
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

  describe('splitTalentsThatHaveMultipleSetsOfEventRequirements', () => {
    it('should split talent with multiple sets of event requirements', () => {
      const talents: TalentData[] = [
        mockTalent({
          id: 1,
          name: 'Event Talent',
          event_requirement_matrix: [
            ['Warrior', 'STR'],
            ['Hunter', 'DEX'],
            ['Arcanist', 'INT'],
          ],
        }),
      ]

      const result = splitTalentsThatHaveMultipleSetsOfEventRequirements(talents)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Event Talent')
      expect(result[0].event_requirement_matrix).toEqual([['Warrior', 'STR']])
      expect(result[1].name).toBe('Event Talent')
      expect(result[1].event_requirement_matrix).toEqual([['Hunter', 'DEX']])
      expect(result[2].name).toBe('Event Talent')
      expect(result[2].event_requirement_matrix).toEqual([['Arcanist', 'INT']])
    })

    it('should NOT split talent with single event requirement set', () => {
      const talents: TalentData[] = [
        mockTalent({
          id: 1,
          name: 'Single Event Talent',
          event_requirement_matrix: [['Warrior', 'STR']],
        }),
      ]

      const result = splitTalentsThatHaveMultipleSetsOfEventRequirements(talents)

      expect(result).toHaveLength(1)
      expect(result[0].event_requirement_matrix).toEqual([['Warrior', 'STR']])
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

  describe('getClassOrEnergyRequirements', () => {
    it('should combine parent requirements with talent requirements', () => {
      const talent = mockTalent({
        requires_classes: ['Warrior'],
        requires_energy: ['STR'],
      })

      const result = getClassOrEnergyRequirements(talent, ['Parent Req'], null)

      expect(result).toContain('Parent Req')
      expect(result).toContain('Warrior')
      expect(result).toContain('STR')
    })

    it('should use event requirements when parent is an event node', () => {
      const talent = mockTalent({
        requires_classes: ['Warrior'],
        requires_energy: ['STR'],
        event_requirement_matrix: [['Event Req 1', 'Event Req 2']],
      })

      const result = getClassOrEnergyRequirements(talent, ['ObtainedFromEvents'], null)

      // When under an event node, use event requirements instead of class/energy
      expect(result).toEqual(['Event Req 1', 'Event Req 2'])
      expect(result).not.toContain('Warrior')
      expect(result).not.toContain('STR')
      expect(result).not.toContain('ObtainedFromEvents')
    })

    it('should filter out HOLY requirement for direct Devotion children', () => {
      const devotionId = 123
      const talent = mockTalent({
        requires_classes: [],
        requires_energy: ['STR', 'INT'],
        requires_talents: [devotionId],
      })

      const result = getClassOrEnergyRequirements(talent, ['HOLY'], devotionId)

      // Should keep Warrior and STR but remove HOLY
      expect(result).toContain('STR')
      expect(result).toContain('INT')
      expect(result).not.toContain('HOLY')
      expect(result).toHaveLength(2)
    })

    it('should remove duplicates from combined requirements', () => {
      const talent = mockTalent({
        requires_classes: ['Warrior'],
        requires_energy: ['STR'],
      })

      const result = getClassOrEnergyRequirements(talent, ['Warrior', 'STR'], null)

      expect(result.filter((r) => r === 'Warrior')).toHaveLength(1)
      expect(result.filter((r) => r === 'STR')).toHaveLength(1)
    })

    it('should handle empty parent requirements', () => {
      const talent = mockTalent({
        requires_classes: ['Warrior'],
        requires_energy: ['STR'],
      })

      const result = getClassOrEnergyRequirements(talent, [], null)

      expect(result).toContain('Warrior')
      expect(result).toContain('STR')
    })

    it('should handle talents with no requirements', () => {
      const talent = mockTalent({
        requires_classes: [],
        requires_energy: [],
      })

      const result = getClassOrEnergyRequirements(talent, ['Parent Req'], null)

      expect(result).toEqual(['Parent Req'])
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
    event_requirement_matrix: [],
    ...overrides,
  }
}
