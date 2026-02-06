// Node types that can appear in the event tree
export type EventNodeType = 'dialogue' | 'choice' | 'combat' | 'special' | 'result' | 'end'

export interface Event {
  name: string
  blightbaneLink: string
  type: number
  artwork: string
  rootNode: EventTreeNode
  deprecated?: boolean
  alias?: string
}

export type EventTreeNode =
  | DialogueNode
  | ChoiceNode
  | EndNode
  | CombatNode
  | SpecialNode
  | ResultNode

export interface DialogueNode extends BaseNode {
  type: 'dialogue'
  text: string
  effects?: string[]
  numContinues?: number
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

export interface SpecialNode extends BaseNode {
  type: 'special'
  text?: string
  effects?: string[]
}

export interface ResultNode extends BaseNode {
  type: 'result'
  requirements?: string[]
  children?: EventTreeNode[]
}

interface BaseNode {
  id: number
  children?: EventTreeNode[]
  ref?: number
  refChildren?: number[]
}
