// Node types that can appear in the event tree
export type EventNodeType = 'dialogue' | 'choice' | 'combat' | 'end'

export interface Event {
  name: string
  type: number
  artwork: string
  rootNode?: EventTreeNode
  excluded?: boolean // True if this event is excluded from visualization
}

export interface EventTreeNode {
  id: string
  text: string
  type: EventNodeType
  children?: EventTreeNode[]
  choiceLabel?: string // Only on 'choice' nodes
  requirements?: string[] // Only on nodes with conditional requirements
  effects?: string[] // Only on 'end' nodes and some dialogue nodes
  repeatable?: boolean // Only included when true (nodes that loop back to earlier dialogue)
  numContinues?: number // Only on some dialogue nodes
}
