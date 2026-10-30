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
  DialogueNode | ChoiceNode | EndNode | CombatNode | SpecialNode | ResultNode

export type RequirementsNode = ChoiceNode | ResultNode | DialogueNode | EndNode

export interface DialogueNode extends BaseNode {
  type: 'dialogue'
  text: string
  effects?: string[]
  numContinues?: number
  requirements?: string[]
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
  requirements?: string[]
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
  // Set during parsing on nodes whose content isn't purely what the Ink story produced.
  // Node was additionally altered based on external knowledge.
  altered?: boolean
}
