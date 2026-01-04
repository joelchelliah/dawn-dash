// Node types that can appear in the event tree
export type EventNodeType = 'dialogue' | 'choice' | 'combat' | 'end'

export interface Event {
  name: string
  type: number
  artwork: string
  rootNode?: EventTreeNode
  excluded?: boolean // True if this event is excluded from visualization
}

export type EventTreeNode = DialogueNode | ChoiceNode | EndNode | CombatNode

interface DialogueNode extends BaseNode {
  type: 'dialogue'
  text: string
}

interface ChoiceNode extends BaseNode {
  type: 'choice'
  choiceLabel: string
}

interface EndNode extends BaseNode {
  type: 'end'
  text: string
}

interface CombatNode extends BaseNode {
  type: 'combat'
  text: string
  effects: string[]
}

interface BaseNode {
  id: string
  type: EventNodeType
  children?: EventTreeNode[]
  requirements?: string[]
  effects?: string[]
  numContinues?: number
  repeatable?: boolean
}
