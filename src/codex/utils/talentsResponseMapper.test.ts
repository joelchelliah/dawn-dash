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
        expect(result).toHaveProperty('cardNode')
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

      it('should have a single card requirement node', () => {
        const talents: TalentData[] = []

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.cardNode).toBeDefined()
        expect(result.cardNode.name).toBe('Obtained from cards')
        expect(result.cardNode.type).toBe(TalentTreeNodeType.CARD_REQUIREMENT)
        expect(result.cardNode.requirementFilterOptions).toEqual([
          RequirementFilterOption.ObtainedFromCards,
        ])
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
          // This should not be in noReqNode because expansion is 0 (offer)
          mockTalent({
            id: 6,
            name: 'Should not appear',
            expansion: 0,
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
          mockTalent({ id: 1, name: 'Pragmatism', events: ['Heated Debate'] }),
          mockTalent({ id: 2, name: 'Sacred Zest', events: ['Heated Debate'] }),
        ]

        const result = mapTalentsDataToTalentTree(talents)
        const eventTalents = result.eventNodes.flatMap((node) => node.children)

        expect(eventTalents).toHaveLength(2)
        expect(eventTalents[0].name).toBe('Pragmatism')
        expect(eventTalents[1].name).toBe('Sacred Zest')
      })
    })

    describe('card-obtained talents', () => {
      it('should place talents with card requirements in cardNode', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            name: 'Devotion',
            requires_cards: ['Sacred Tome'],
            requires_talents: [],
          }),
          mockTalent({
            id: 2,
            name: 'Mark of Taurus',
            requires_cards: ['Taurus Rage'],
            requires_talents: [],
          }),
          mockTalent({
            id: 3,
            name: 'Undead',
            requires_cards: ['Dark Revenance'],
            requires_talents: [],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.cardNode.children).toHaveLength(3)
        expect(result.cardNode.children.find((t) => t.name === 'Devotion')).toBeDefined()
        expect(result.cardNode.children.find((t) => t.name === 'Mark of Taurus')).toBeDefined()
        expect(result.cardNode.children.find((t) => t.name === 'Undead')).toBeDefined()
      })

      it('should only place talents with card requirements and no talent requirements in cardNode', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            blightbane_id: 10,
            name: 'Card Talent',
            requires_cards: ['Some Card'],
            requires_talents: [],
            required_for_talents: [20],
          }),
          mockTalent({
            id: 2,
            blightbane_id: 20,
            name: 'Child Talent',
            requires_cards: [],
            requires_talents: [10],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        // Only the root card talent should be in cardNode (has card requirement, no talent requirement)
        expect(result.cardNode.children).toHaveLength(1)
        expect(result.cardNode.children[0].name).toBe('Card Talent')
        // The child should be nested under the parent (child has talent requirement, so not a root card talent)
        expect(result.cardNode.children[0].children).toHaveLength(1)
        expect(result.cardNode.children[0].children[0].name).toBe('Child Talent')
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
        expect(warriorNode?.children[0].classOrEnergyRequirements).toContain('Warrior')
        expect(warriorNode?.children[0].classOrEnergyRequirements).toContain('STR')
        expect(warriorNode?.children[0].classOrEnergyRequirements).toHaveLength(2)

        const strNode = result.energyNodes.find((node) => node.name === 'STR')
        expect(strNode?.children[0]?.classOrEnergyRequirements).toContain('Warrior')
        expect(strNode?.children[0]?.classOrEnergyRequirements).toContain('STR')
        expect(strNode?.children[0]?.classOrEnergyRequirements).toHaveLength(2)
      })

      it('should split talents with multiple event requirement sets and map each separately', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            blightbane_id: 100,
            name: 'Multi-Event Talent',
            expansion: 1,
            requires_classes: [],
            requires_energy: [],
            requires_talents: [],
            required_for_talents: [],
            event_requirement_matrix: [
              ['Warrior', 'STR'],
              ['Hunter', 'DEX'],
              ['Arcanist', 'INT'],
            ],
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        // Should be split into 3 separate nodes under noReqNode
        // Event requirements are NOT shown when parent is noReqNode
        expect(result.noReqNode.children).toHaveLength(3)
        expect(result.noReqNode.children[0].name).toBe('Multi-Event Talent')
        expect(result.noReqNode.children[0].classOrEnergyRequirements).toEqual(['No Requirements'])
        expect(result.noReqNode.children[1].name).toBe('Multi-Event Talent')
        expect(result.noReqNode.children[1].classOrEnergyRequirements).toEqual(['No Requirements'])
        expect(result.noReqNode.children[2].name).toBe('Multi-Event Talent')
        expect(result.noReqNode.children[2].classOrEnergyRequirements).toEqual(['No Requirements'])
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

    it('should set expansion to 0 for talents in ACTUALLY_EVENT_ONLY_TALENTS list', () => {
      const talents: TalentData[] = [
        mockTalent({
          id: 1,
          name: 'Pragmatism',
          expansion: 1,
          events: ['Heated Debate'],
        }),
        mockTalent({
          id: 2,
          name: 'Sacred Zest',
          expansion: 2,
          events: ['Heated Debate'],
        }),
        // This one should be in both eventNode and noReqNode
        mockTalent({
          id: 3,
          name: 'Regular Talent',
          expansion: 1,
          events: ['Some Event'],
        }),
      ]

      const result = mapTalentsDataToTalentTree(talents)

      const heatedDebateNode = result.eventNodes.find((node) => node.name === 'Heated Debate')
      expect(heatedDebateNode).toBeDefined()
      expect(heatedDebateNode?.children).toHaveLength(2)

      const pragmatism = heatedDebateNode?.children.find((child) => child.name === 'Pragmatism')
      const sacredZest = heatedDebateNode?.children.find((child) => child.name === 'Sacred Zest')
      expect(pragmatism?.expansion).toBe(0)
      expect(sacredZest?.expansion).toBe(0)

      const someEventNode = result.eventNodes.find((node) => node.name === 'Some Event')
      const regularTalent = someEventNode?.children.find((child) => child.name === 'Regular Talent')
      expect(regularTalent?.expansion).toBe(1)

      const noReqNode = result.noReqNode.children.find((child) => child.name === 'Regular Talent')
      expect(noReqNode).toBeDefined()
      expect(noReqNode?.expansion).toBe(1)
    })

    describe('edge cases', () => {
      it('should handle talents with missing children gracefully', () => {
        const talents: TalentData[] = [
          mockTalent({
            id: 1,
            blightbane_id: 10,
            name: 'Parent',
            expansion: 1,
            required_for_talents: [999], // Non-existent child
          }),
        ]

        const result = mapTalentsDataToTalentTree(talents)

        expect(result.noReqNode.children[0].name).toBe('Parent')
        expect(result.noReqNode.children[0].children).toHaveLength(0) // Missing child filtered out
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
    event_requirement_matrix: [],
    requires_cards: [],
    blightbane_id: 1,
    last_updated: '2024-01-01',
    verified: true,
    ...overrides,
  }
}
