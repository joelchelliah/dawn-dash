import { TalentData, TalentTreeNodeType } from '../types/talents'
import { RequirementFilterOption } from '../types/filters'

import { mapTalentsDataToTalentTree } from './talentsResponseMapper'

describe('talentsResponseMapper', () => {
  describe('mapTalentsDataToTalentTree', () => {
    describe('basic structure', () => {
      it('should return a talent tree with all required root nodes', () => {
        const talents: TalentData[] = []

        const result = mapTalentsDataToTalentTree(talents)

        expect(result).toHaveProperty('noReqNode')
        expect(result).toHaveProperty('classNodes')
        expect(result).toHaveProperty('energyNodes')
        expect(result).toHaveProperty('eventNodes')
        expect(result).toHaveProperty('cardNodes')
        expect(result).toHaveProperty('offerNode')
      })

      it('should initialize noReqNode correctly', () => {
        const talents: TalentData[] = []

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.noReqNode.type).toBe(TalentTreeNodeType.NO_REQUIREMENTS)
        expect(result.noReqNode.name).toBe('No Requirements')
        expect(result.noReqNode.requirementFilterOptions).toEqual([
          RequirementFilterOption.NoRequirements,
        ])
        expect(result.noReqNode.children).toEqual([])
      })

      it('should initialize offerNode correctly', () => {
        const talents: TalentData[] = []

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.offerNode.type).toBe(TalentTreeNodeType.OFFER_REQUIREMENT)
        expect(result.offerNode.name).toBe('Offers')
        expect(result.offerNode.requirementFilterOptions).toEqual([RequirementFilterOption.Offer])
        expect(result.offerNode.children).toEqual([])
      })

      it('should create class requirement nodes for all classes', () => {
        const talents: TalentData[] = []

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.classNodes.length).toBeGreaterThan(0)
        result.classNodes.forEach((node) => {
          expect(node.type).toBe(TalentTreeNodeType.CLASS_REQUIREMENT)
          expect(node.name).toBeTruthy()
          expect(Array.isArray(node.requirementFilterOptions)).toBe(true)
          expect(Array.isArray(node.children)).toBe(true)
        })
      })

      it('should create energy requirement nodes for all energy types', () => {
        const talents: TalentData[] = []

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.energyNodes.length).toBeGreaterThan(0)
        result.energyNodes.forEach((node) => {
          expect(node.type).toBe(TalentTreeNodeType.ENERGY_REQUIREMENT)
          expect(node.name).toBeTruthy()
          expect(Array.isArray(node.requirementFilterOptions)).toBe(true)
          expect(Array.isArray(node.children)).toBe(true)
        })
      })

      it('should have exactly 3 card requirement nodes', () => {
        const talents: TalentData[] = []

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.cardNodes).toHaveLength(3)
        expect(result.cardNodes[0].name).toBe('Sacred Tome')
        expect(result.cardNodes[1].name).toBe('Taurus Rage')
        expect(result.cardNodes[2].name).toBe('Dark Revenance')
      })
    })

    describe('No requirements', () => {
      it('should only place regular talents with no requirements in noReqNode', () => {
        const talents: TalentData[] = [
          // Regular talent
          mockTalent({
            id: 1,
            name: 'Correct Talent',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [],
          }),
          // Regular talents with requirements
          mockTalent({
            id: 2,
            name: 'Talent with class requirement',
            expansion: 1,
            requires_classes: ['Warrior'],
            requires_energy: [],
            requires_talents: [],
          }),
          mockTalent({
            id: 3,
            name: 'Talent with energy requirement',
            expansion: 1,
            requires_classes: [],
            requires_energy: ['STR'],
            requires_talents: [],
          }),
          mockTalent({
            id: 4,
            name: 'Talent with talent requirement',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [10],
          }),
          // 0-expansion talent
          mockTalent({
            id: 5,
            name: 'Offer of WRONG!',
            expansion: 0,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [],
          }),
          // Talent obtained from card
          mockTalent({
            id: 6,
            name: 'Mark of Taurus',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.noReqNode.children).toHaveLength(1)
        expect(result.noReqNode.children[0].name).toBe('Correct Talent')
        expect(result.noReqNode.children[0].type).toBe(TalentTreeNodeType.TALENT)
      })
    })

    describe('Class requirements', () => {
      it('should place talents with class requirements in correct classNode', () => {
        const talents: TalentData[] = [
          // Warrior
          mockTalent({
            id: 1,
            name: 'Warrior Talent',
            requires_classes: ['Warrior'],
            requires_talents: [],
            requires_energy: [],
          }),
          // Warrior with talent requirement
          mockTalent({
            id: 2,
            name: 'Advanced Warrior Talent',
            requires_classes: ['Warrior'],
            requires_talents: [10],
            requires_energy: [],
          }),
          // Hunter
          mockTalent({
            id: 3,
            name: 'Hunter Talent',
            requires_classes: ['Hunter'],
            requires_talents: [],
            requires_energy: [],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        const warriorNode = result.classNodes.find((node) => node.name === 'Warrior')
        expect(warriorNode).toBeDefined()
        expect(warriorNode?.children).toHaveLength(1)
        expect(warriorNode?.children[0].name).toBe('Warrior Talent')

        const hunterNode = result.classNodes.find((node) => node.name === 'Hunter')
        expect(hunterNode).toBeDefined()
        expect(hunterNode?.children).toHaveLength(1)
        expect(hunterNode?.children[0].name).toBe('Hunter Talent')
      })
    })

    describe('Energy requirements', () => {
      it('should place talents with energy requirements in correct energyNode', () => {
        const talents: TalentData[] = [
          // STR
          mockTalent({
            id: 1,
            name: 'STR Talent',
            requires_classes: [],
            requires_talents: [],
            requires_energy: ['STR'],
          }),
          // STR with talent requirement
          mockTalent({
            id: 2,
            name: 'Advanced STR Talent',
            requires_classes: [],
            requires_talents: [10],
            requires_energy: ['STR'],
          }),
          // INT
          mockTalent({
            id: 3,
            name: 'INT Talent',
            requires_classes: [],
            requires_talents: [],
            requires_energy: ['INT'],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        const strNode = result.energyNodes.find((node) => node.name === 'STR')
        expect(strNode).toBeDefined()
        expect(strNode?.children).toHaveLength(1)
        expect(strNode?.children[0].name).toBe('STR Talent')

        const intNode = result.energyNodes.find((node) => node.name === 'INT')
        expect(intNode).toBeDefined()
        expect(intNode?.children).toHaveLength(1)
        expect(intNode?.children[0].name).toBe('INT Talent')
      })
    })

    describe('Offers', () => {
      it('should place valid offers in offerNode', () => {
        const talents: TalentData[] = [
          mockTalent({ id: 1, name: 'Offer of Deez Nuts', expansion: 0 }),
          // Wrong format
          mockTalent({ id: 2, name: 'Not An Offer', expansion: 0 }),
          // Wrong expansion
          mockTalent({ id: 3, name: 'Offer of Wrong Expansion', expansion: 1 }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.offerNode.children).toHaveLength(1)
        expect(result.offerNode.children[0].name).toBe('Offer of Deez Nuts')
      })
    })

    describe('Event talents', () => {
      it('should place valid event talents in eventNodes', () => {
        const talents: TalentData[] = [
          // Valid event talents
          mockTalent({ id: 1, name: 'Pragmatism', events: ['Heated Debate'] }),
          mockTalent({ id: 2, name: 'Sacred Zest', events: ['Heated Debate'] }),
          // Blacklisted event talents
          mockTalent({ id: 3, name: 'Devotion', events: ['WindyHillock'] }),
          mockTalent({ id: 4, name: 'Watched', events: ['The Deep Finish'] }),
        ]

        const result = mapTalentsDataToTalentTree(talents)
        const eventTalents = result.eventNodes.flatMap((node) => node.children)

        expect(eventTalents).toHaveLength(2)
        expect(eventTalents[0].name).toBe('Pragmatism')
        expect(eventTalents[1].name).toBe('Sacred Zest')
      })

      it('should merge together Priest events', () => {
        const talents: TalentData[] = [
          mockTalent({ id: 1, name: 'Devotion', events: ['Priest'] }),
          mockTalent({ id: 2, name: 'Devotion', events: ['Priest 1'] }),
          mockTalent({ id: 3, name: 'Devotion', events: ['Prayer'] }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.eventNodes).toHaveLength(1)
        expect(result.eventNodes[0].name).toEqual('Prayer, Priest, Priest 1')
      })

      it('should merge together The Deep Finish events', () => {
        const talents: TalentData[] = [
          mockTalent({ id: 1, name: 'Blessing of Serem-Pek', events: ['The Deep Finish'] }),
          mockTalent({
            id: 2,
            name: 'Blessing of Serem-Pek',
            events: ['The Godscar Wastes Finish'],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.eventNodes).toHaveLength(1)
        expect(result.eventNodes[0].name).toEqual('The Deep Finish, The Godscar Wastes Finish')
      })
    })

    describe('card-specific talents', () => {
      it('should place Devotion talent in Sacred Tome cardNode', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            name: 'Devotion',
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        const sacredTomeNode = result.cardNodes.find((node) => node.name === 'Sacred Tome')
        expect(sacredTomeNode?.children).toHaveLength(1)
        expect(sacredTomeNode?.children[0].name).toBe('Devotion')
      })

      it('should place Mark of Taurus talent in Taurus Rage cardNode', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            name: 'Mark of Taurus',
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        const taurusNode = result.cardNodes.find((node) => node.name === 'Taurus Rage')
        expect(taurusNode?.children).toHaveLength(1)
        expect(taurusNode?.children[0].name).toBe('Mark of Taurus')
      })

      it('should place Undead talent in Dark Revenance cardNode', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            name: 'Undead',
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        const darkRevenanceNode = result.cardNodes.find((node) => node.name === 'Dark Revenance')
        expect(darkRevenanceNode?.children).toHaveLength(1)
        expect(darkRevenanceNode?.children[0].name).toBe('Undead')
      })
    })

    describe('talent tree building', () => {
      it('should build parent-child relationships correctly', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            blightbane_id: 10,
            name: 'Parent Talent',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [],
            required_for_talents: [20],
          }),
          mockTalent({
            id: 2,
            blightbane_id: 20,
            name: 'Child Talent',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [10],
            required_for_talents: [],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.noReqNode.children).toHaveLength(1)
        expect(result.noReqNode.children[0].name).toBe('Parent Talent')
        expect(result.noReqNode.children[0].children).toHaveLength(1)
        expect(result.noReqNode.children[0].children[0].name).toBe('Child Talent')
      })

      it('should populate descendants array correctly', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            blightbane_id: 10,
            name: 'Grandparent',
            expansion: 1,
            required_for_talents: [20],
          }),
          mockTalent({
            id: 2,
            blightbane_id: 20,
            name: 'Parent',
            expansion: 1,
            requires_talents: [10],
            required_for_talents: [30],
          }),
          mockTalent({
            id: 3,
            blightbane_id: 30,
            name: 'Child',
            expansion: 1,
            requires_talents: [20],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        const grandparent = result.noReqNode.children[0]
        expect(grandparent.descendants).toContain('Parent')
        expect(grandparent.descendants).toContain('Child')
      })

      it('should include classOrEnergyRequirements in talent nodes', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            name: 'Warrior Talent',
            expansion: 1,
            requires_classes: ['Warrior'],
            requires_energy: ['STR'],
            requires_talents: [],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        const warriorNode = result.classNodes.find((node) => node.name === 'Warrior')
        const talent = warriorNode?.children[0]
        expect(talent?.classOrEnergyRequirements).toEqual(['Warrior', 'STR'])
      })

      it('should throw error for recursive talent loops', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            blightbane_id: 10,
            name: 'Talent A',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [],
            required_for_talents: [20, 10], // Points to itself via chain
          }),
          mockTalent({
            id: 2,
            blightbane_id: 20,
            name: 'Talent B',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [10],
            required_for_talents: [10], // Creates circular dependency
          }),
        ]

        expect(() => mapTalentsDataToTalentTree(talents)).toThrow(/Recursive loop detected/)
      })
    })

    describe('sorting', () => {
      it('should sort talent nodes by tier then name', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            name: 'Zebra Talent',
            tier: 2,
            expansion: 1,
          }),
          mockTalent({
            id: 2,
            name: 'Alpha Talent',
            tier: 1,
            expansion: 1,
          }),
          mockTalent({
            id: 3,
            name: 'Beta Talent',
            tier: 1,
            expansion: 1,
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.noReqNode.children[0].name).toBe('Alpha Talent')
        expect(result.noReqNode.children[1].name).toBe('Beta Talent')
        expect(result.noReqNode.children[2].name).toBe('Zebra Talent')
      })

      it('should sort requirement nodes alphabetically by name', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            name: 'Talent 1',
            events: ['Zombie'],
          }),
          mockTalent({
            id: 2,
            name: 'Talent 2',
            events: ['Alpha Event'],
          }),
          mockTalent({
            id: 3,
            name: 'Talent 3',
            events: ['Beta Event'],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.eventNodes[0].name).toBe('Alpha Event')
        expect(result.eventNodes[1].name).toBe('Beta Event')
        expect(result.eventNodes[2].name).toBe('Zombie')
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
