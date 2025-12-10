import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  HierarchicalTalentTreeNode,
  TalentTree,
  TalentTreeNode,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '../types/talents'

export const isTalentTreeEqual = (talentTreeA: TalentTree, talentTreeB: TalentTree): boolean =>
  isTalentTreeNodeEqual(talentTreeA.offerNode, talentTreeB.offerNode) &&
  isTalentTreeNodeEqual(talentTreeA.noReqNode, talentTreeB.noReqNode) &&
  areTalentTreeNodesEqual(talentTreeA.classNodes, talentTreeB.classNodes) &&
  areTalentTreeNodesEqual(talentTreeA.classAndEnergyNodes, talentTreeB.classAndEnergyNodes) &&
  areTalentTreeNodesEqual(talentTreeA.energyNodes, talentTreeB.energyNodes) &&
  areTalentTreeNodesEqual(talentTreeA.eventNodes, talentTreeB.eventNodes)

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

  const eventNodesRoot = {
    name: 'Events',
    description: '',
    type: TalentTreeNodeType.EVENT_REQUIREMENT,
    children: eventNodes,
  }
  return {
    name: 'Root',
    description: '',
    children: [
      buildHierarchicalTreeNodeFromRequirementNode(talentTree.noReqNode),
      ...talentTree.energyNodes
        .map(buildHierarchicalTreeNodeFromRequirementNode)
        .filter(isNotNullOrUndefined),
      ...talentTree.classAndEnergyNodes
        .map(buildHierarchicalTreeNodeFromRequirementNode)
        .filter(isNotNullOrUndefined),
      ...talentTree.classNodes
        .map(buildHierarchicalTreeNodeFromRequirementNode)
        .filter(isNotNullOrUndefined),
      ...(eventNodes.length > 0 ? [eventNodesRoot] : []),
      buildHierarchicalTreeNodeFromRequirementNode(talentTree.offerNode),
    ].filter(isNotNullOrUndefined),
  }
}

const buildHierarchicalTreeNodeFromTalentNode = (
  node: TalentTreeTalentNode,
  parentName: string
): HierarchicalTalentTreeNode => {
  const name = node.name
  const children = node.children.map((child) =>
    buildHierarchicalTreeNodeFromTalentNode(child, name)
  )

  // Special case, since Goldstrike has 2 compulsory prerequisites...
  const otherParentNames =
    name === 'Goldstrike'
      ? ['Collector', 'Forgery'].filter((otherName) => otherName !== parentName)
      : undefined

  return {
    name,
    description: node.description,
    type: TalentTreeNodeType.TALENT,
    tier: node.tier,
    children: children.length > 0 ? children : undefined,
    otherParentNames: otherParentNames?.length ? otherParentNames : undefined,
  }
}

const buildHierarchicalTreeNodeFromRequirementNode = (
  node: TalentTreeRequirementNode
): HierarchicalTalentTreeNode | undefined => {
  const children = node.children.map((child) =>
    buildHierarchicalTreeNodeFromTalentNode(child, node.name)
  )

  if (children.length === 0) {
    return undefined
  }

  return {
    name: node.name,
    description: node.name,
    type: node.type,
    children,
  }
}
