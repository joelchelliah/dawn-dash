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
  areTalentTreeNodesEqual(talentTreeA.energyNodes, talentTreeB.energyNodes)

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
      ...talentTree.classNodes
        .map(buildHierarchicalTreeNodeFromRequirementNode)
        .filter(isNotNullOrUndefined),
      ...(eventNodes.length > 0 ? [eventNodesRoot] : []),
      buildHierarchicalTreeNodeFromRequirementNode(talentTree.offerNode),
    ].filter(isNotNullOrUndefined),
  }
}

const buildHierarchicalTreeNodeFromTalentNode = (
  node: TalentTreeTalentNode
): HierarchicalTalentTreeNode => {
  const children = node.children.map(buildHierarchicalTreeNodeFromTalentNode)

  return {
    name: node.name,
    description: node.description,
    type: TalentTreeNodeType.TALENT,
    tier: node.tier,
    children: children.length > 0 ? children : undefined,
  }
}

const buildHierarchicalTreeNodeFromRequirementNode = (
  node: TalentTreeRequirementNode
): HierarchicalTalentTreeNode | undefined => {
  const children = node.children.map(buildHierarchicalTreeNodeFromTalentNode)

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
