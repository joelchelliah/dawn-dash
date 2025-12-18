import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  HierarchicalTalentTreeNode,
  TalentTree,
  TalentTreeNode,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '../types/talents'
import { RequirementFilterOption } from '../types/filters'

export const isTalentTreeEqual = (talentTreeA: TalentTree, talentTreeB: TalentTree): boolean =>
  isTalentTreeNodeEqual(talentTreeA.offerNode, talentTreeB.offerNode) &&
  isTalentTreeNodeEqual(talentTreeA.noReqNode, talentTreeB.noReqNode) &&
  areTalentTreeNodesEqual(talentTreeA.classNodes, talentTreeB.classNodes) &&
  areTalentTreeNodesEqual(talentTreeA.energyNodes, talentTreeB.energyNodes) &&
  areTalentTreeNodesEqual(talentTreeA.eventNodes, talentTreeB.eventNodes) &&
  areTalentTreeNodesEqual(talentTreeA.cardNodes, talentTreeB.cardNodes)

const areTalentTreeNodesEqual = (nodesA: TalentTreeNode[], nodesB: TalentTreeNode[]): boolean =>
  nodesA.length === nodesB.length &&
  nodesA.every((a) => nodesB.some((b) => isTalentTreeNodeEqual(a, b))) &&
  nodesB.every((b) => nodesA.some((a) => isTalentTreeNodeEqual(a, b)))

const isTalentTreeNodeEqual = (nodeA: TalentTreeNode, nodeB: TalentTreeNode): boolean => {
  if (nodeA.type !== nodeB.type) return false

  if (nodeA.type === TalentTreeNodeType.TALENT && nodeB.type === TalentTreeNodeType.TALENT) {
    return (
      nodeA.name === nodeB.name &&
      nodeA.description === nodeB.description &&
      nodeA.tier === nodeB.tier &&
      areTalentTreeNodesEqual(nodeA.children, nodeB.children)
    )
  } else {
    return nodeA.name === nodeB.name && areTalentTreeNodesEqual(nodeA.children, nodeB.children)
  }
}

export const buildHierarchicalTreeFromTalentTree = (
  talentTree: TalentTree
): HierarchicalTalentTreeNode => {
  const eventNodes = talentTree.eventNodes
    .map(buildHierarchicalTreeNodeFromRequirementNode)
    .filter(isNotNullOrUndefined)

  const eventNodesRoot: HierarchicalTalentTreeNode = {
    name: 'Obtained from events',
    description: '',
    type: TalentTreeNodeType.EVENT_REQUIREMENT,
    children: eventNodes,
    classOrEnergyRequirements: [RequirementFilterOption.ObtainedFromEvents],
  }

  const cardNodes = talentTree.cardNodes
    .map(buildHierarchicalTreeNodeFromRequirementNode)
    .filter(isNotNullOrUndefined)

  const cardNodesRoot: HierarchicalTalentTreeNode = {
    name: 'Obtained from cards',
    description: '',
    type: TalentTreeNodeType.CARD_REQUIREMENT,
    children: cardNodes,
    classOrEnergyRequirements: [RequirementFilterOption.ObtainedFromCards],
  }

  return {
    name: 'Root',
    description: '',
    children: [
      buildHierarchicalTreeNodeFromRequirementNode(talentTree.noReqNode),
      ...talentTree.energyNodes
        .map(buildHierarchicalTreeNodeFromRequirementNode)
        .filter(isNotNullOrUndefined),
      ...talentTree.classNodes
        .map(buildHierarchicalTreeNodeFromRequirementNode)
        .filter(isNotNullOrUndefined),
      ...(eventNodes.length > 0 ? [eventNodesRoot] : []),
      ...(cardNodes.length > 0 ? [cardNodesRoot] : []),
      buildHierarchicalTreeNodeFromRequirementNode(talentTree.offerNode),
    ].filter(isNotNullOrUndefined),
    classOrEnergyRequirements: [],
  }
}

const buildHierarchicalTreeNodeFromTalentNode = (
  node: TalentTreeTalentNode,
  parentName: string,
  parentRequirements: string[]
): HierarchicalTalentTreeNode => {
  const name = node.name
  const isParentAnEventNode = parentRequirements.includes(
    RequirementFilterOption.ObtainedFromEvents
  )

  let requirements = Array.from(
    new Set([...parentRequirements, ...node.classOrEnergyRequirements].filter(isNotNullOrUndefined))
  )
  /* If the talent has any event requirements, and the parent node is an event node,
   * then we only need to use the talent's event requirements here.
   */
  if (isParentAnEventNode && node.eventRequirements.length > 0) {
    requirements = node.eventRequirements
  }
  /* ...Oh damit `Devotion`... Gah stupid special case!
   * So for Priest -> Devotion -> Pious, we don't want to show HOLY, even though it's from an event!
   *
   * Too messy to handle in the dataset I think... Hence this hack.
   */
  if (parentName === 'Devotion') {
    requirements = []
  }

  const children = node.children.map((child) =>
    buildHierarchicalTreeNodeFromTalentNode(child, name, requirements)
  )

  // Special cases, for cards that have other prerequisites.
  let otherParentNames: string[] | undefined = undefined
  if (name === 'Goldstrike') {
    otherParentNames = ['Collector', 'Forgery'].filter((otherName) => otherName !== parentName)
  } else if (name === 'Blessing of Serem-Pek') {
    otherParentNames = ['Watched']
  } else if (name === 'Compassionate' && parentName === 'WoundedAnimal') {
    otherParentNames = ['Healing potion']
  }

  return {
    name,
    description: node.description,
    type: TalentTreeNodeType.TALENT,
    tier: node.tier,
    children: children.length > 0 ? children : undefined,
    otherParentNames: otherParentNames?.length ? otherParentNames : undefined,
    classOrEnergyRequirements: requirements,
  }
}

const buildHierarchicalTreeNodeFromRequirementNode = (
  node: TalentTreeRequirementNode
): HierarchicalTalentTreeNode | undefined => {
  const requirements =
    node.type === TalentTreeNodeType.EVENT_REQUIREMENT
      ? [RequirementFilterOption.ObtainedFromEvents]
      : node.type === TalentTreeNodeType.CARD_REQUIREMENT
        ? [RequirementFilterOption.ObtainedFromCards]
        : node.name.split('_')

  const children = node.children.map((child) =>
    buildHierarchicalTreeNodeFromTalentNode(child, node.name, requirements)
  )

  if (children.length === 0) {
    return undefined
  }

  return {
    name: node.name,
    description: node.name,
    type: node.type,
    children,
    classOrEnergyRequirements: requirements,
  }
}
