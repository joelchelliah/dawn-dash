import {
  TalentTree,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '../types/talents'
import { RequirementFilterOption } from '../types/filters'

import { isTalentTreeEqual, buildHierarchicalTreeFromTalentTree } from './treeHelper'

describe('treeHelper', () => {
  describe('isTalentTreeEqual', () => {
    it('should return false for different noReqNode', () => {
      const tree1 = mockTalentTree({
        noReqNode: mockRequirementNode({
          name: 'No Requirements',
          children: [mockTalentNode({ name: 'Talent A' })],
        }),
      })
      const tree2 = mockTalentTree({
        noReqNode: mockRequirementNode({
          name: 'No Requirements',
          children: [mockTalentNode({ name: 'Talent B' })],
        }),
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })

    it('should return false for different offerNode', () => {
      const tree1 = mockTalentTree({
        offerNode: mockRequirementNode({
          name: 'Offers',
          children: [mockTalentNode({ name: 'Offer A' })],
        }),
      })
      const tree2 = mockTalentTree({
        offerNode: mockRequirementNode({
          name: 'Offers',
          children: [mockTalentNode({ name: 'Offer B' })],
        }),
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })

    it('should return false for different classNodes length', () => {
      const tree1 = mockTalentTree({
        classNodes: [
          mockRequirementNode({ name: 'Warrior' }),
          mockRequirementNode({ name: 'Rogue' }),
        ],
      })
      const tree2 = mockTalentTree({
        classNodes: [mockRequirementNode({ name: 'Warrior' })],
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })

    it('should return false for different energyNodes', () => {
      const tree1 = mockTalentTree({
        energyNodes: [mockRequirementNode({ name: 'STR' })],
      })
      const tree2 = mockTalentTree({
        energyNodes: [mockRequirementNode({ name: 'INT' })],
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })

    it('should return false for different eventNodes', () => {
      const tree1 = mockTalentTree({
        eventNodes: [mockRequirementNode({ name: 'Event A' })],
      })
      const tree2 = mockTalentTree({
        eventNodes: [mockRequirementNode({ name: 'Event B' })],
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })

    it('should return false for different cardNodes', () => {
      const tree1 = mockTalentTree({
        cardNodes: [mockRequirementNode({ name: 'Card A' })],
      })
      const tree2 = mockTalentTree({
        cardNodes: [mockRequirementNode({ name: 'Card B' })],
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })

    it('should compare talent nodes by name, description, and tier', () => {
      const tree1 = mockTalentTree({
        noReqNode: mockRequirementNode({
          children: [mockTalentNode({ name: 'Talent', description: 'Desc A', tier: 1 })],
        }),
      })
      const tree2 = mockTalentTree({
        noReqNode: mockRequirementNode({
          children: [mockTalentNode({ name: 'Talent', description: 'Desc B', tier: 1 })],
        }),
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })

    it('should compare nested children recursively', () => {
      const tree1 = mockTalentTree({
        noReqNode: mockRequirementNode({
          children: [
            mockTalentNode({
              name: 'Parent',
              children: [mockTalentNode({ name: 'Child A' })],
            }),
          ],
        }),
      })
      const tree2 = mockTalentTree({
        noReqNode: mockRequirementNode({
          children: [
            mockTalentNode({
              name: 'Parent',
              children: [mockTalentNode({ name: 'Child B' })],
            }),
          ],
        }),
      })

      expect(isTalentTreeEqual(tree1, tree2)).toBe(false)
    })
  })

  describe('buildHierarchicalTreeFromTalentTree', () => {
    it('should create root node with all sections', () => {
      const talentTree = mockTalentTree()

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      expect(result.name).toBe('Root')
      expect(result.children).toBeDefined()
      expect(result.classOrEnergyRequirements).toEqual([])
    })

    it('should include noReqNode in root children', () => {
      const talentTree = mockTalentTree({
        noReqNode: mockRequirementNode({
          name: 'No Requirements',
          children: [mockTalentNode({ name: 'Test Talent' })],
        }),
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const noReqChild = result.children?.find((c) => c.name === 'No Requirements')
      expect(noReqChild).toBeDefined()
      expect(noReqChild?.children).toHaveLength(1)
    })

    it('should include energyNodes in root children', () => {
      const talentTree = mockTalentTree({
        energyNodes: [
          mockRequirementNode({
            name: 'STR',
            type: TalentTreeNodeType.ENERGY_REQUIREMENT,
            children: [mockTalentNode({ name: 'STR Talent' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const strNode = result.children?.find((c) => c.name === 'STR')
      expect(strNode).toBeDefined()
      expect(strNode?.type).toBe(TalentTreeNodeType.ENERGY_REQUIREMENT)
    })

    it('should include classNodes in root children', () => {
      const talentTree = mockTalentTree({
        classNodes: [
          mockRequirementNode({
            name: 'Warrior',
            type: TalentTreeNodeType.CLASS_REQUIREMENT,
            children: [mockTalentNode({ name: 'Warrior Talent' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const warriorNode = result.children?.find((c) => c.name === 'Warrior')
      expect(warriorNode).toBeDefined()
      expect(warriorNode?.type).toBe(TalentTreeNodeType.CLASS_REQUIREMENT)
    })

    it('should create eventNodesRoot when eventNodes exist', () => {
      const talentTree = mockTalentTree({
        eventNodes: [
          mockRequirementNode({
            name: 'Test Event',
            type: TalentTreeNodeType.EVENT_REQUIREMENT,
            children: [mockTalentNode({ name: 'Event Talent' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const eventRoot = result.children?.find((c) => c.name === 'Obtained from events')
      expect(eventRoot).toBeDefined()
      expect(eventRoot?.type).toBe(TalentTreeNodeType.EVENT_REQUIREMENT)
      expect(eventRoot?.classOrEnergyRequirements).toEqual([
        RequirementFilterOption.ObtainedFromEvents,
      ])
      expect(eventRoot?.children).toHaveLength(1)
      expect(eventRoot?.children?.[0].name).toBe('Test Event')
    })

    it('should not include eventNodesRoot when eventNodes is empty', () => {
      const talentTree = mockTalentTree({
        eventNodes: [],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const eventRoot = result.children?.find((c) => c.name === 'Obtained from events')
      expect(eventRoot).toBeUndefined()
    })

    it('should create cardNodesRoot when cardNodes exist', () => {
      const talentTree = mockTalentTree({
        cardNodes: [
          mockRequirementNode({
            name: 'Sacred Tome',
            type: TalentTreeNodeType.CARD_REQUIREMENT,
            children: [mockTalentNode({ name: 'Devotion' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const cardRoot = result.children?.find((c) => c.name === 'Obtained from cards')
      expect(cardRoot).toBeDefined()
      expect(cardRoot?.type).toBe(TalentTreeNodeType.CARD_REQUIREMENT)
      expect(cardRoot?.classOrEnergyRequirements).toEqual([
        RequirementFilterOption.ObtainedFromCards,
      ])
      expect(cardRoot?.children).toHaveLength(1)
    })

    it('should not include cardNodesRoot when cardNodes is empty', () => {
      const talentTree = mockTalentTree({
        cardNodes: [],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const cardRoot = result.children?.find((c) => c.name === 'Obtained from cards')
      expect(cardRoot).toBeUndefined()
    })

    it('should include offerNode in root children', () => {
      const talentTree = mockTalentTree({
        offerNode: mockRequirementNode({
          name: 'Offers',
          children: [mockTalentNode({ name: 'Offer of Power' })],
        }),
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const offerNode = result.children?.find((c) => c.name === 'Offers')
      expect(offerNode).toBeDefined()
    })

    it('should filter out requirement nodes with no children', () => {
      const talentTree = mockTalentTree({
        classNodes: [
          mockRequirementNode({ name: 'Warrior', children: [] }),
          mockRequirementNode({
            name: 'Rogue',
            children: [mockTalentNode({ name: 'Rogue Talent' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const warriorNode = result.children?.find((c) => c.name === 'Warrior')
      const rogueNode = result.children?.find((c) => c.name === 'Rogue')

      expect(warriorNode).toBeUndefined()
      expect(rogueNode).toBeDefined()
    })

    it('should preserve talent node properties', () => {
      const talentTree = mockTalentTree({
        noReqNode: mockRequirementNode({
          name: 'No Requirements',
          type: TalentTreeNodeType.NO_REQUIREMENTS,
          children: [
            mockTalentNode({
              name: 'Test Talent',
              description: 'Test description',
              tier: 3,
              classOrEnergyRequirements: ['Warrior', 'STR'],
            }),
          ],
        }),
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const noReqNode = result.children?.find((c) => c.name === 'No Requirements')
      expect(noReqNode).toBeDefined()

      const talent = noReqNode?.children?.[0]
      expect(talent).toBeDefined()
      expect(talent?.name).toBe('Test Talent')
      expect(talent?.description).toBe('Test description')
      expect(talent?.tier).toBe(3)
      expect(talent?.type).toBe(TalentTreeNodeType.TALENT)
      expect(talent?.classOrEnergyRequirements).toEqual(['Warrior', 'STR'])
    })

    it('should handle nested talent children', () => {
      const talentTree = mockTalentTree({
        noReqNode: mockRequirementNode({
          name: 'No Requirements',
          type: TalentTreeNodeType.NO_REQUIREMENTS,
          children: [
            mockTalentNode({
              name: 'Parent',
              children: [
                mockTalentNode({
                  name: 'Child',
                  children: [mockTalentNode({ name: 'Grandchild' })],
                }),
              ],
            }),
          ],
        }),
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const noReqNode = result.children?.find((c) => c.name === 'No Requirements')
      expect(noReqNode).toBeDefined()

      const parent = noReqNode?.children?.[0]
      expect(parent).toBeDefined()
      expect(parent?.name).toBe('Parent')

      const child = parent?.children?.[0]
      expect(child).toBeDefined()
      expect(child?.name).toBe('Child')

      const grandchild = child?.children?.[0]
      expect(grandchild).toBeDefined()
      expect(grandchild?.name).toBe('Grandchild')
    })

    it('should set otherParentNames for Goldstrike with Collector parent', () => {
      const talentTree = mockTalentTree({
        noReqNode: mockRequirementNode({
          name: 'Collector',
          children: [mockTalentNode({ name: 'Goldstrike' })],
        }),
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const collectorNode = result.children?.find((c) => c.name === 'Collector')
      const goldstrike = collectorNode?.children?.[0]

      expect(goldstrike?.otherParentNames).toEqual(['Forgery'])
    })

    it('should set otherParentNames for Goldstrike with Forgery parent', () => {
      const talentTree = mockTalentTree({
        noReqNode: mockRequirementNode({
          name: 'Forgery',
          children: [mockTalentNode({ name: 'Goldstrike' })],
        }),
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const forgeryNode = result.children?.find((c) => c.name === 'Forgery')
      const goldstrike = forgeryNode?.children?.[0]

      expect(goldstrike?.otherParentNames).toEqual(['Collector'])
    })

    it('should set otherParentNames for Blessing of Serem-Pek', () => {
      const talentTree = mockTalentTree({
        eventNodes: [
          mockRequirementNode({
            name: 'The Godscar Wastes Finish',
            type: TalentTreeNodeType.EVENT_REQUIREMENT,
            children: [mockTalentNode({ name: 'Blessing of Serem-Pek' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const eventRoot = result.children?.find((c) => c.name === 'Obtained from events')
      const eventNode = eventRoot?.children?.[0]
      const blessing = eventNode?.children?.[0]

      expect(blessing?.otherParentNames).toEqual(['Watched'])
    })

    it('should set otherParentNames for Compassionate from WoundedAnimal', () => {
      const talentTree = mockTalentTree({
        eventNodes: [
          mockRequirementNode({
            name: 'WoundedAnimal',
            type: TalentTreeNodeType.EVENT_REQUIREMENT,
            children: [mockTalentNode({ name: 'Compassionate' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const eventRoot = result.children?.find((c) => c.name === 'Obtained from events')
      const eventNode = eventRoot?.children?.[0]
      const compassionate = eventNode?.children?.[0]

      expect(compassionate?.otherParentNames).toEqual(['Healing potion'])
    })

    it('should not set otherParentNames for Compassionate from other parents', () => {
      const talentTree = mockTalentTree({
        eventNodes: [
          mockRequirementNode({
            name: 'Other Event',
            type: TalentTreeNodeType.EVENT_REQUIREMENT,
            children: [mockTalentNode({ name: 'Compassionate' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const eventRoot = result.children?.find((c) => c.name === 'Obtained from events')
      const eventNode = eventRoot?.children?.[0]
      const compassionate = eventNode?.children?.[0]

      expect(compassionate?.otherParentNames).toBeUndefined()
    })

    it('should set classOrEnergyRequirements to requirement name for non-event/card nodes', () => {
      const talentTree = mockTalentTree({
        classNodes: [
          mockRequirementNode({
            name: 'Warrior',
            type: TalentTreeNodeType.CLASS_REQUIREMENT,
            children: [mockTalentNode({ name: 'Warrior Talent' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const warriorNode = result.children?.find((c) => c.name === 'Warrior')
      expect(warriorNode?.classOrEnergyRequirements).toEqual(['Warrior'])
    })

    it('should set empty classOrEnergyRequirements for event requirement nodes', () => {
      const talentTree = mockTalentTree({
        eventNodes: [
          mockRequirementNode({
            name: 'Test Event',
            type: TalentTreeNodeType.EVENT_REQUIREMENT,
            children: [mockTalentNode({ name: 'Event Talent' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const eventRoot = result.children?.find((c) => c.name === 'Obtained from events')
      const eventNode = eventRoot?.children?.[0]

      expect(eventNode?.classOrEnergyRequirements).toEqual([])
    })

    it('should set empty classOrEnergyRequirements for card requirement nodes', () => {
      const talentTree = mockTalentTree({
        cardNodes: [
          mockRequirementNode({
            name: 'Sacred Tome',
            type: TalentTreeNodeType.CARD_REQUIREMENT,
            children: [mockTalentNode({ name: 'Devotion' })],
          }),
        ],
      })

      const result = buildHierarchicalTreeFromTalentTree(talentTree)

      const cardRoot = result.children?.find((c) => c.name === 'Obtained from cards')
      const cardNode = cardRoot?.children?.[0]

      expect(cardNode?.classOrEnergyRequirements).toEqual([])
    })
  })
})

// Mock helper functions

function mockTalentTree(overrides: Partial<TalentTree> = {}): TalentTree {
  return {
    noReqNode: mockRequirementNode({ name: 'No Requirements' }),
    classNodes: [],
    energyNodes: [],
    eventNodes: [],
    cardNodes: [],
    offerNode: mockRequirementNode({ name: 'Offers' }),
    ...overrides,
  }
}

function mockRequirementNode(
  overrides: Partial<TalentTreeRequirementNode> = {}
): TalentTreeRequirementNode {
  return {
    type: TalentTreeNodeType.NO_REQUIREMENTS,
    name: 'Mock Requirement',
    requirementFilterOptions: [],
    children: [],
    ...overrides,
  }
}

function mockTalentNode(overrides: Partial<TalentTreeTalentNode> = {}): TalentTreeTalentNode {
  return {
    type: TalentTreeNodeType.TALENT,
    name: 'Mock Talent',
    description: 'Mock description',
    flavourText: 'Mock flavour',
    tier: 1,
    expansion: 1,
    events: [],
    children: [],
    descendants: [],
    classOrEnergyRequirements: [],
    ...overrides,
  }
}
