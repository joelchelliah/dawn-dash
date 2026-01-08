/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Event, EventTreeNode } from '../types/events'

import { adjustTreeSpacing, getNodeHeight } from './eventTreeHelper'

// Helper type to match D3's HierarchyPointNode structure
interface TestHierarchyNode {
  data: EventTreeNode
  depth: number
  x: number
  y: number
  parent?: TestHierarchyNode
  children?: TestHierarchyNode[]
  descendants(): TestHierarchyNode[]
}

describe('eventTreeHelper', () => {
  describe('adjustTreeSpacing', () => {
    it('should not adjust root node position', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({ id: 'root', text: 'Root' }),
      })

      const root = createTreeLayout(event.rootNode)
      const originalRootY = root.y

      adjustTreeSpacing(root as any, event, 100)

      expect(root.y).toBe(originalRootY)
    })

    it('should adjust child position when gap is too small', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root with lots of text that makes it tall',
          effects: ['Effect 1', 'Effect 2', 'Effect 3', 'Effect 4'],
          children: [mockEndNode({ id: 'child', text: 'Child' })],
        }),
      })

      const root = createTreeLayout(event.rootNode, [225, 80]) // Smaller spacing
      const child = root.children![0]
      const originalGap = calculateGap(root, child, event)

      adjustTreeSpacing(root as any, event, 100)

      const newGap = calculateGap(root, child, event)
      expect(newGap).toBeGreaterThanOrEqual(100)
      expect(newGap).toBeGreaterThan(originalGap)
    })

    it('should not adjust when gap is already sufficient', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root',
          children: [mockEndNode({ id: 'child', text: 'Child' })],
        }),
      })

      const root = createTreeLayout(event.rootNode, [225, 300]) // Large vertical spacing
      const child = root.children![0]
      const originalY = child.y

      adjustTreeSpacing(root as any, event, 100)

      expect(child.y).toBe(originalY)
    })

    it('should align all siblings at the same depth horizontally', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root with lots of text to make it tall',
          effects: ['Effect 1', 'Effect 2', 'Effect 3'],
          children: [
            mockDialogueNode({
              id: 'child1',
              text: 'Short child 1',
              children: [mockEndNode({ id: 'grandchild1', text: 'End 1' })],
            }),
            mockDialogueNode({
              id: 'child2',
              text: 'Short child 2',
              children: [mockEndNode({ id: 'grandchild2', text: 'End 2' })],
            }),
          ],
        }),
      })

      const root = createTreeLayout(event.rootNode)
      adjustTreeSpacing(root as any, event, 100)

      const child1 = root.children![0]
      const child2 = root.children![1]

      expect(child1.y).toBe(child2.y)
    })

    it('should handle multiple depth levels', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root',
          children: [
            mockDialogueNode({
              id: 'child',
              text: 'Child',
              children: [
                mockEndNode({
                  id: 'grandchild',
                  text: 'Grandchild',
                }),
              ],
            }),
          ],
        }),
      })

      const root = createTreeLayout(event.rootNode)
      adjustTreeSpacing(root as any, event, 100)

      const child = root.children![0]
      const grandchild = child.children![0]

      const gapRootToChild = calculateGap(root, child, event)
      const gapChildToGrandchild = calculateGap(child, grandchild, event)

      expect(gapRootToChild).toBeGreaterThanOrEqual(100)
      expect(gapChildToGrandchild).toBeGreaterThanOrEqual(100)
    })

    it('should adjust based on minimum gap among siblings with different parent heights', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root',
          children: [
            mockDialogueNode({
              id: 'child1',
              text: 'Tall child with lots of text that wraps',
              effects: ['Effect 1', 'Effect 2'],
              children: [mockEndNode({ id: 'grandchild1', text: 'End 1' })],
            }),
            mockDialogueNode({
              id: 'child2',
              text: 'Short',
              children: [mockEndNode({ id: 'grandchild2', text: 'End 2' })],
            }),
          ],
        }),
      })

      const root = createTreeLayout(event.rootNode)
      adjustTreeSpacing(root as any, event, 100)

      const grandchild1 = root.children![0].children![0]
      const grandchild2 = root.children![1].children![0]

      // Grandchildren should be aligned horizontally
      expect(grandchild1.y).toBe(grandchild2.y)

      // Both gaps should be at least the desired gap
      const gap1 = calculateGap(root.children![0], grandchild1, event)
      const gap2 = calculateGap(root.children![1], grandchild2, event)

      expect(gap1).toBeGreaterThanOrEqual(100)
      expect(gap2).toBeGreaterThanOrEqual(100)
    })

    it('should handle choice nodes with requirements', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root',
          children: [
            mockChoiceNode({
              id: 'choice',
              choiceLabel: 'Choose wisely',
              requirements: ['gold:50', 'class:warrior'],
              children: [mockEndNode({ id: 'end', text: 'Result' })],
            }),
          ],
        }),
      })

      const root = createTreeLayout(event.rootNode)
      adjustTreeSpacing(root as any, event, 100)

      const choice = root.children![0]
      const end = choice.children![0]

      const gap = calculateGap(choice, end, event)
      expect(gap).toBeGreaterThanOrEqual(100)
    })

    it('should handle combat nodes', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root',
          children: [
            mockCombatNode({
              id: 'combat',
              text: 'Fight!',
              effects: ['damage:10'],
              children: [mockEndNode({ id: 'end', text: 'Victory' })],
            }),
          ],
        }),
      })

      const root = createTreeLayout(event.rootNode)
      adjustTreeSpacing(root as any, event, 100)

      const combat = root.children![0]
      const end = combat.children![0]

      const gap = calculateGap(combat, end, event)
      expect(gap).toBeGreaterThanOrEqual(100)
    })

    it('should respect custom desiredGap parameter', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root',
          children: [mockEndNode({ id: 'child', text: 'Child' })],
        }),
      })

      const root = createTreeLayout(event.rootNode)
      adjustTreeSpacing(root as any, event, 200)

      const child = root.children![0]
      const gap = calculateGap(root, child, event)

      expect(gap).toBeGreaterThanOrEqual(200)
    })

    it('should cascade adjustments to deeper levels', () => {
      const event = mockEvent({
        rootNode: mockDialogueNode({
          id: 'root',
          text: 'Root',
          children: [
            mockDialogueNode({
              id: 'child',
              text: 'Child',
              children: [
                mockDialogueNode({
                  id: 'grandchild',
                  text: 'Grandchild',
                  children: [mockEndNode({ id: 'greatgrandchild', text: 'End' })],
                }),
              ],
            }),
          ],
        }),
      })

      const root = createTreeLayout(event.rootNode)
      const child = root.children![0]
      const grandchild = child.children![0]
      const greatgrandchild = grandchild.children![0]

      const originalGreatGrandchildY = greatgrandchild.y

      adjustTreeSpacing(root as any, event, 100)

      // Great-grandchild should move if child moves
      expect(greatgrandchild.y).toBeGreaterThanOrEqual(originalGreatGrandchildY)
    })
  })
})

// Helper functions

function calculateGap(parent: TestHierarchyNode, child: TestHierarchyNode, event: Event): number {
  const parentHeight = getNodeHeight(parent.data, event)
  const childHeight = getNodeHeight(child.data, event)
  return child.y - parent.y - (parentHeight / 2 + childHeight / 2)
}

function createTreeLayout(
  rootNode: EventTreeNode | undefined,
  nodeSize: [number, number] = [225, 130]
): TestHierarchyNode {
  if (!rootNode) {
    throw new Error('Root node is required')
  }
  // Manually create a tree structure that simulates D3's tree layout
  // Simple vertical layout with fixed spacing
  const createNode = (
    data: EventTreeNode,
    depth: number,
    y: number,
    parent?: TestHierarchyNode
  ): TestHierarchyNode => {
    const node: TestHierarchyNode = {
      data,
      depth,
      x: 0, // Center horizontally
      y,
      parent,
      children: undefined,
      descendants() {
        const result: TestHierarchyNode[] = [this]
        if (this.children) {
          this.children.forEach((child) => {
            result.push(...child.descendants())
          })
        }
        return result
      },
    }

    if (data.children && data.children.length > 0) {
      node.children = data.children.map((childData, index) => {
        // Position children with equal horizontal spacing
        const child = createNode(childData, depth + 1, y + nodeSize[1], node)
        child.x = (index - (data.children!.length - 1) / 2) * nodeSize[0]
        return child
      })
    }

    return node
  }

  return createNode(rootNode, 0, 0)
}

// Mock helper functions

function mockEvent(overrides: Partial<Event> = {}): Event {
  const defaults: Event = {
    name: 'Test Event',
    type: 1,
    artwork: 'test.png',
    rootNode: mockDialogueNode({ id: 'root', text: 'Root' }),
  }
  return { ...defaults, ...overrides }
}

function mockDialogueNode(overrides: any): EventTreeNode {
  return {
    type: 'dialogue',
    text: '',
    effects: [],
    children: [],
    ...overrides,
  } as EventTreeNode
}

function mockChoiceNode(overrides: any): EventTreeNode {
  return {
    type: 'choice',
    requirements: [],
    children: [],
    ...overrides,
  } as EventTreeNode
}

function mockCombatNode(overrides: any): EventTreeNode {
  return {
    type: 'combat',
    text: '',
    effects: [],
    children: [],
    ...overrides,
  } as EventTreeNode
}

function mockEndNode(overrides: any): EventTreeNode {
  return {
    type: 'end',
    text: '',
    effects: [],
    ...overrides,
  } as EventTreeNode
}
