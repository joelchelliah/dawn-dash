import { useCallback, useEffect, useRef, useState } from 'react'

import { isNotNullOrUndefined } from '@/shared/utils/object'

import {
  TalentTree,
  TalentTreeNode,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '@/codex/types/talents'
import {
  cacheTalentCodexSearchFilters,
  getCachedTalentCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'
import { isTalentEventBased, isTalentOffer } from '@/codex/utils/talentHelper'

import { useCardSetFilters } from './useCardSetFilters'
import { useExtraTalentFilters } from './useExtraTalentFilters'
import { useTierFilters } from './useTierFilters'
import { useKeywords } from './useKeywords'

export interface UseAllTalentSearchFilters {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  matchingTalentTree: TalentTree | undefined
  useCardSetFilters: ReturnType<typeof useCardSetFilters>
  useTierFilters: ReturnType<typeof useTierFilters>
  useExtraTalentFilters: ReturnType<typeof useExtraTalentFilters>
  resetFilters: () => void
}

export const useAllTalentSearchFilters = (
  talentTree: TalentTree | undefined
): UseAllTalentSearchFilters => {
  const cachedFilters = getCachedTalentCodexSearchFilters()
  const {
    keywords,
    setKeywords: setKeywordsUntracked,
    parsedKeywords,
    resetParsedKeywords,
  } = useKeywords(cachedFilters?.keywords)
  const [matchingTalentTree, setMatchingTalentTree] = useState<TalentTree | undefined>(undefined)

  const untrackedUseCardSetFilters = useCardSetFilters(cachedFilters?.cardSets)
  const untrackedUseTierFilters = useTierFilters(cachedFilters?.tiers)
  const untrackedUseExtraTalentFilters = useExtraTalentFilters(cachedFilters?.extras)
  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // ------ to avoid initial cache saves on load ------
  // --------------------------------------------------
  const hasUserChangedFilter = useRef(false)

  const trackedSetKeywords = (keywords: string) => {
    hasUserChangedFilter.current = true
    setKeywordsUntracked(keywords)
  }

  const trackedUseCardSetFilters = {
    ...untrackedUseCardSetFilters,
    handleCardSetFilterToggle: (cardSet: string) => {
      hasUserChangedFilter.current = true
      untrackedUseCardSetFilters.handleCardSetFilterToggle(cardSet)
    },
  }

  const trackedUseTierFilters = {
    ...untrackedUseTierFilters,
    handleTierFilterToggle: (tier: string) => {
      hasUserChangedFilter.current = true
      untrackedUseTierFilters.handleTierFilterToggle(tier)
    },
  }

  const trackedUseExtraTalentFilters = {
    ...untrackedUseExtraTalentFilters,
    handleExtraTalentFilterToggle: (extraTalent: string) => {
      hasUserChangedFilter.current = true
      untrackedUseExtraTalentFilters.handleExtraTalentFilterToggle(extraTalent)
    },
  }
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, isCardSetIndexSelected, resetCardSetFilters } = trackedUseCardSetFilters
  const { tierFilters, isTierIndexSelected, resetTierFilters } = trackedUseTierFilters
  const {
    extraTalentFilters,
    shouldIncludeOffers,
    shouldIncludeEventBasedTalents,
    resetExtraTalentFilters,
  } = trackedUseExtraTalentFilters

  const resetFilters = () => {
    trackedSetKeywords('')
    resetParsedKeywords()
    resetCardSetFilters()
    resetTierFilters()
    resetExtraTalentFilters()
  }

  // --------------------------------------------------
  // -------- Debounced caching of filters ------------
  // --------------------------------------------------
  const filterDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!hasUserChangedFilter.current) return

    if (filterDebounceTimeoutRef.current) {
      clearTimeout(filterDebounceTimeoutRef.current)
    }

    filterDebounceTimeoutRef.current = setTimeout(() => {
      cacheTalentCodexSearchFilters({
        keywords,
        cardSets: cardSetFilters,
        tiers: tierFilters,
        extras: extraTalentFilters,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [cardSetFilters, tierFilters, keywords, extraTalentFilters])

  // --------------------------------------------------
  // ------------- Filtering logic --------------------
  // --------------------------------------------------

  const traverseNode = useCallback(
    (node: TalentTreeNode, visitTalent: (talent: TalentTreeTalentNode) => void) => {
      if (node.type === TalentTreeNodeType.TALENT) {
        visitTalent(node)
        node.children.forEach((child) => traverseNode(child, visitTalent))
      } else {
        node.children.forEach((child) => traverseNode(child, visitTalent))
      }
    },
    []
  )

  const traverseTree = useCallback(
    (talentTree: TalentTree, visitTalent: (talent: TalentTreeTalentNode) => void) => {
      traverseNode(talentTree.offerNode, visitTalent)
      traverseNode(talentTree.noReqNode, visitTalent)
      talentTree.classNodes.forEach((node) => traverseNode(node, visitTalent))
      talentTree.energyNodes.forEach((node) => traverseNode(node, visitTalent))
    },
    [traverseNode]
  )

  const hasMatchInDescendants = useCallback(
    (node: TalentTreeNode, targets: Set<string>): boolean => {
      if (node.type === TalentTreeNodeType.TALENT && targets.has(node.name)) return true
      return node.children.some((child) => hasMatchInDescendants(child, targets))
    },
    []
  )

  const collectMatchingTalentNames = useCallback(
    (
      talentTree: TalentTree,
      isMatchingTalent: (talent: TalentTreeTalentNode) => boolean
    ): Set<string> => {
      const directMatches = new Set<string>()

      // Step 1: Find direct matches
      traverseTree(talentTree, (node) => {
        if (isMatchingTalent(node)) directMatches.add(node.name)
      })

      const allMatches = new Set(directMatches)

      // Step 2: Add ancestors and descendants
      traverseTree(talentTree, (node) => {
        // If any descendant is a direct match, add this node (ancestor)
        if (hasMatchInDescendants(node, directMatches)) {
          allMatches.add(node.name)
        }

        // If this node is a direct match, add all its descendants
        if (directMatches.has(node.name)) {
          traverseNode(node, (descendant) => allMatches.add(descendant.name))
        }
      })

      return allMatches
    },
    [traverseTree, hasMatchInDescendants, traverseNode]
  )

  const filterTalentTreeNode = useCallback(
    <T extends TalentTreeTalentNode | TalentTreeRequirementNode>(
      node: T,
      matchingTalentNames: Set<string>
    ): T | null => {
      const filteredChildren = node.children
        .map((child) => filterTalentTreeNode(child, matchingTalentNames))
        .filter(isNotNullOrUndefined)

      const shouldInclude =
        node.type === TalentTreeNodeType.TALENT
          ? matchingTalentNames.has(node.name) || filteredChildren.length > 0
          : filteredChildren.length > 0

      return shouldInclude ? ({ ...node, children: filteredChildren } as T) : null
    },
    []
  )

  const isMatchingTalent = useCallback(
    (node: TalentTreeTalentNode) => {
      const passesExpansionFilter =
        shouldIncludeOffers ||
        shouldIncludeEventBasedTalents ||
        isCardSetIndexSelected(node.expansion)

      const passesOfferFilter = !isTalentOffer(node) || shouldIncludeOffers
      const passesEventFilter = !isTalentEventBased(node) || shouldIncludeEventBasedTalents

      const passesTierFilter = isTierIndexSelected(node.tier)
      const passesKeywordFilter = isNameOrDescriptionIncluded(node, parsedKeywords)

      return (
        passesExpansionFilter &&
        passesOfferFilter &&
        passesEventFilter &&
        passesTierFilter &&
        passesKeywordFilter
      )
    },
    [
      shouldIncludeOffers,
      shouldIncludeEventBasedTalents,
      isCardSetIndexSelected,
      isTierIndexSelected,
      parsedKeywords,
    ]
  )

  useEffect(() => {
    if (!talentTree) return

    const matchingTalentNames = collectMatchingTalentNames(talentTree, isMatchingTalent)

    const filteredOfferNodes = talentTree.offerNode.children
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)
    const filteredTalentNodes = talentTree.noReqNode.children
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)
    const filteredClassNodes = talentTree.classNodes
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)
    const filteredEnergyNodes = talentTree.energyNodes
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)

    const filteredTree: TalentTree = {
      offerNode: {
        ...talentTree.offerNode,
        children: filteredOfferNodes,
      },
      noReqNode: {
        ...talentTree.noReqNode,
        children: filteredTalentNodes,
      },
      classNodes: filteredClassNodes,
      energyNodes: filteredEnergyNodes,
    }

    if (!matchingTalentTree || !isTalentTreeEqual(filteredTree, matchingTalentTree)) {
      setMatchingTalentTree(filteredTree)
    }
  }, [
    collectMatchingTalentNames,
    filterTalentTreeNode,
    isMatchingTalent,
    matchingTalentTree,
    talentTree,
  ])
  // --------------------------------------------------
  // --------------------------------------------------

  return {
    keywords,
    setKeywords: trackedSetKeywords,
    parsedKeywords,
    matchingTalentTree,
    useCardSetFilters: trackedUseCardSetFilters,
    useTierFilters: trackedUseTierFilters,
    useExtraTalentFilters: trackedUseExtraTalentFilters,
    resetFilters,
  }
}

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

const isTalentTreeEqual = (talentTreeA: TalentTree, talentTreeB: TalentTree): boolean =>
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
