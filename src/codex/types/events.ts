// Node types that can appear in the event tree
export type EventNodeType = 'dialogue' | 'choice' | 'combat' | 'end'

export interface Event {
  name: string
  type: number
  artwork: string
  rootNode: EventTreeNode
}

export type EventTreeNode = DialogueNode | ChoiceNode | EndNode | CombatNode

export interface DialogueNode extends BaseNode {
  type: 'dialogue'
  text: string
  effects?: string[]
}

export interface ChoiceNode extends BaseNode {
  type: 'choice'
  choiceLabel: string
  requirements?: string[]
}

export interface EndNode extends BaseNode {
  type: 'end'
  text?: string
  effects?: string[]
}

export interface CombatNode extends BaseNode {
  type: 'combat'
  text?: string
  effects: string[]
}

interface BaseNode {
  id: number
  children?: EventTreeNode[]
  numContinues?: number
  ref?: number
  refChildren?: number[]
}
