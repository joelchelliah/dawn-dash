import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  TalentTree,
  TalentTreeNode,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '@/codex/types/talents'
import { isTalentOffer } from '@/codex/utils/talentTreeHelper'
import { RequirementFilterOption } from '@/codex/types/filters'

export interface TalentFilterCriteria {
  parsedKeywords: string[]
  isCardSetIndexSelected: (index: number) => boolean
  isTierIndexSelected: (index: number) => boolean
  isRequirementSelected: (options: RequirementFilterOption[]) => boolean
}

type TalentPredicate = (talent: TalentTreeTalentNode) => boolean

/**
 * Filters the talent tree down to the talents matching the given criteria.
 * Talents in the different tree sections (regular, event, card, offer, unavailable)
 * are matched with section-specific predicates, and matches are expanded with
 * their ancestors and matching descendants to keep prerequisite paths intact.
 */
export const filterTalentTree = (
  talentTree: TalentTree,
  criteria: TalentFilterCriteria
): TalentTree => {
  const { isRequirementSelected } = criteria

  const shouldIncludeEvents = isRequirementSelected([RequirementFilterOption.ObtainedFromEvents])
  const shouldIncludeCards = isRequirementSelected([RequirementFilterOption.ObtainedFromCards])
  const shouldIncludeOffers = isRequirementSelected([RequirementFilterOption.Offer])
  const shouldIncludeUnavailable = isRequirementSelected([RequirementFilterOption.Unavailable])

  const predicates = createSectionPredicates(criteria)

  const regularMatches = findMatchingTalents(
    [talentTree.noReqNode, ...talentTree.classNodes, ...talentTree.energyNodes],
    predicates.regular
  )
  const eventMatches = shouldIncludeEvents
    ? findMatchingTalents(talentTree.eventNodes, predicates.event)
    : new Set<string>()

  return {
    noReqNode: {
      ...talentTree.noReqNode,
      children: isRequirementSelected(talentTree.noReqNode.requirementFilterOptions)
        ? filterRequirementNodeChildren(talentTree.noReqNode, regularMatches)
        : [],
    },
    classNodes: filterRequirementNodes(
      talentTree.classNodes,
      regularMatches,
      isRequirementSelected
    ),
    energyNodes: filterRequirementNodes(
      talentTree.energyNodes,
      regularMatches,
      isRequirementSelected
    ),
    eventNodes: shouldIncludeEvents
      ? talentTree.eventNodes
          .map((node) => filterNode(node, eventMatches))
          .filter(isNotNullOrUndefined)
      : [],
    cardNode: {
      ...talentTree.cardNode,
      children: shouldIncludeCards
        ? filterRequirementNodeChildren(
            talentTree.cardNode,
            findMatchingTalents([talentTree.cardNode], predicates.card)
          )
        : [],
    },
    offerNode: {
      ...talentTree.offerNode,
      children: shouldIncludeOffers
        ? filterRequirementNodeChildren(
            talentTree.offerNode,
            findMatchingTalents([talentTree.offerNode], predicates.offer)
          )
        : [],
    },
    unavailableNode: {
      ...talentTree.unavailableNode,
      children: shouldIncludeUnavailable
        ? filterRequirementNodeChildren(
            talentTree.unavailableNode,
            findMatchingTalents([talentTree.unavailableNode], predicates.unavailable)
          )
        : [],
    },
  }
}

const createSectionPredicates = (
  criteria: TalentFilterCriteria
): Record<'regular' | 'event' | 'card' | 'offer' | 'unavailable', TalentPredicate> => {
  const { parsedKeywords, isCardSetIndexSelected, isTierIndexSelected } = criteria

  const matchesTierAndKeywords: TalentPredicate = (talent) =>
    isTierIndexSelected(talent.tier) && isNameOrDescriptionIncluded(talent, parsedKeywords)

  return {
    regular: (talent) => isCardSetIndexSelected(talent.expansion) && matchesTierAndKeywords(talent),
    event: matchesTierAndKeywords,
    card: matchesTierAndKeywords,
    offer: (talent) => isTalentOffer(talent) && matchesTierAndKeywords(talent),
    unavailable: matchesTierAndKeywords,
  }
}

/**
 * Collects the names of all talents under the given roots that match the predicate,
 * expanded with:
 * - ancestors of matched talents (so the path to a match is preserved)
 * - descendants of matched talents, but only those that also match the predicate
 */
const findMatchingTalents = (roots: TalentTreeNode[], predicate: TalentPredicate): Set<string> => {
  const matches = new Set<string>()
  const talentsByName = new Map<string, TalentTreeTalentNode>()

  visitTalents(roots, (talent) => {
    talentsByName.set(talent.name, talent)
    if (predicate(talent)) matches.add(talent.name)
  })

  const expandedMatches = new Set(matches)
  visitTalents(roots, (talent) => {
    // Ancestor matching: if any descendant matches, include this ancestor
    if (talent.descendants.some((name) => matches.has(name))) {
      expandedMatches.add(talent.name)
    }
    // Descendant matching: only include descendants that also match the predicate
    if (matches.has(talent.name)) {
      talent.descendants.forEach((name) => {
        const descendant = talentsByName.get(name)
        if (descendant && predicate(descendant)) {
          expandedMatches.add(name)
        }
      })
    }
  })

  return expandedMatches
}

const visitTalents = (
  roots: TalentTreeNode[],
  visit: (talent: TalentTreeTalentNode) => void
): void => {
  roots.forEach((node) => {
    if (node.type === TalentTreeNodeType.TALENT) {
      visit(node)
    }
    visitTalents(node.children, visit)
  })
}

/**
 * Prunes the subtree down to the matching talents and their surviving branches.
 * A talent is kept if it matched or any of its children survive; requirement nodes
 * are kept only when they have surviving children.
 * Returns a new tree (input is not mutated), or null if nothing survives.
 */
const filterNode = <T extends TalentTreeTalentNode | TalentTreeRequirementNode>(
  node: T,
  matchingTalentNames: Set<string>
): T | null => {
  const filteredChildren = node.children
    .map((child) => filterNode(child, matchingTalentNames))
    .filter(isNotNullOrUndefined)

  const shouldInclude =
    node.type === TalentTreeNodeType.TALENT
      ? matchingTalentNames.has(node.name) || filteredChildren.length > 0
      : filteredChildren.length > 0

  return shouldInclude ? ({ ...node, children: filteredChildren } as T) : null
}

const filterRequirementNodeChildren = (
  node: TalentTreeRequirementNode,
  matches: Set<string>
): TalentTreeTalentNode[] =>
  node.children.map((child) => filterNode(child, matches)).filter(isNotNullOrUndefined)

const filterRequirementNodes = (
  nodes: TalentTreeRequirementNode[],
  matches: Set<string>,
  isRequirementSelected: TalentFilterCriteria['isRequirementSelected']
): TalentTreeRequirementNode[] =>
  nodes
    .filter((node) => isRequirementSelected(node.requirementFilterOptions))
    .map((node) => filterNode(node, matches))
    .filter(isNotNullOrUndefined)

const isNameOrDescriptionIncluded = (
  { name, description }: TalentTreeTalentNode,
  keywords: string[]
): boolean =>
  keywords.length === 0 ||
  keywords.some(
    (keyword) =>
      name.toLowerCase().includes(keyword.toLowerCase()) ||
      description.toLowerCase().includes(keyword.toLowerCase())
  )
