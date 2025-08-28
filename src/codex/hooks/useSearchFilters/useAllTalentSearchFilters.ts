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
import { isTalentOnlyFromEvents, isTalentOffer } from '@/codex/utils/talentHelper'
import { isTalentTreeEqual } from '@/codex/utils/treeHelper'

import { useCardSetFilters } from './useCardSetFilters'
import { useExtraTalentFilters } from './useExtraTalentFilters'
import { useTierFilters } from './useTierFilters'
import { useKeywords } from './useKeywords'
import { useFilterTracking } from './useFilterTracking'
import { useFormattingTalentFilters } from './useFormattingTalentFilters'
import { useRequirementFilters } from './useRequirementFilters'

export interface UseAllTalentSearchFilters {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  matchingTalentTree: TalentTree | undefined
  useCardSetFilters: ReturnType<typeof useCardSetFilters>
  useRequirementFilters: ReturnType<typeof useRequirementFilters>
  useTierFilters: ReturnType<typeof useTierFilters>
  useExtraTalentFilters: ReturnType<typeof useExtraTalentFilters>
  useFormattingFilters: ReturnType<typeof useFormattingTalentFilters>
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
  const untrackedUseRequirementFilters = useRequirementFilters(cachedFilters?.requirements)
  const untrackedUseTierFilters = useTierFilters(cachedFilters?.tiers)
  const untrackedUseExtraTalentFilters = useExtraTalentFilters(cachedFilters?.extras)
  const untrackedUseFormattingFilters = useFormattingTalentFilters(cachedFilters?.formatting)
  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedFilter, createTrackedSetter } = useFilterTracking()

  const TRACKED_FILTER_HANDLER = {
    cardSet: 'handleCardSetFilterToggle' as const,
    requirement: 'handleRequirementFilterToggle' as const,
    tier: 'handleTierFilterToggle' as const,
    extraTalent: 'handleExtraTalentFilterToggle' as const,
    formatting: 'handleFormattingFilterToggle' as const,
  } as const

  const trackedSetKeywords = createTrackedSetter(setKeywordsUntracked)

  const trackedUseCardSetFilters = createTrackedFilter(
    untrackedUseCardSetFilters,
    TRACKED_FILTER_HANDLER.cardSet
  )
  const trackedUseRequirementFilters = createTrackedFilter(
    untrackedUseRequirementFilters,
    TRACKED_FILTER_HANDLER.requirement
  )
  const trackedUseTierFilters = createTrackedFilter(
    untrackedUseTierFilters,
    TRACKED_FILTER_HANDLER.tier
  )
  const trackedUseExtraTalentFilters = createTrackedFilter(
    untrackedUseExtraTalentFilters,
    TRACKED_FILTER_HANDLER.extraTalent
  )
  const trackedUseFormattingFilters = createTrackedFilter(
    untrackedUseFormattingFilters,
    TRACKED_FILTER_HANDLER.formatting
  )
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, isCardSetIndexSelected, resetCardSetFilters } = trackedUseCardSetFilters
  const { requirementFilters, isRequirementSelectedOrIrrelevant, resetRequirementFilters } =
    trackedUseRequirementFilters
  const { tierFilters, isTierIndexSelected, resetTierFilters } = trackedUseTierFilters
  const { extraTalentFilters, shouldIncludeOffers, shouldIncludeEvents, resetExtraTalentFilters } =
    trackedUseExtraTalentFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters

  const resetFilters = () => {
    trackedSetKeywords('')
    resetParsedKeywords()
    resetCardSetFilters()
    resetRequirementFilters()
    resetTierFilters()
    resetExtraTalentFilters()
    resetFormattingFilters()
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
        requirements: requirementFilters,
        tiers: tierFilters,
        extras: extraTalentFilters,
        formatting: formattingFilters,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [
    cardSetFilters,
    requirementFilters,
    tierFilters,
    keywords,
    extraTalentFilters,
    formattingFilters,
    hasUserChangedFilter,
  ])

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
      traverseNode(talentTree.noReqNode, visitTalent)
      talentTree.classNodes.forEach((node) => traverseNode(node, visitTalent))
      talentTree.energyNodes.forEach((node) => traverseNode(node, visitTalent))
      talentTree.eventNodes.forEach((node) => traverseNode(node, visitTalent))
      traverseNode(talentTree.offerNode, visitTalent)
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
    (talent: TalentTreeTalentNode) => {
      const isOffer = isTalentOffer(talent)
      const isEventOnlyTalent = isTalentOnlyFromEvents(talent)

      const passesExpansionFilter =
        (isOffer && shouldIncludeOffers) ||
        (isEventOnlyTalent && shouldIncludeEvents) ||
        (!isOffer && !isEventOnlyTalent && isCardSetIndexSelected(talent.expansion))

      const passesTierFilter = isTierIndexSelected(talent.tier)

      return (
        passesExpansionFilter &&
        passesTierFilter &&
        isNameOrDescriptionIncluded(talent, parsedKeywords)
      )
    },
    [
      shouldIncludeOffers,
      shouldIncludeEvents,
      isCardSetIndexSelected,
      isTierIndexSelected,
      parsedKeywords,
    ]
  )

  useEffect(() => {
    if (!talentTree) return

    const matchingTalentNames = collectMatchingTalentNames(talentTree, isMatchingTalent)

    const filteredTalentNodes = isRequirementSelectedOrIrrelevant(
      talentTree.noReqNode.requirementFilterOption
    )
      ? talentTree.noReqNode.children
          .map((node) => filterTalentTreeNode(node, matchingTalentNames))
          .filter(isNotNullOrUndefined)
      : []
    const filteredClassNodes = talentTree.classNodes
      .filter((node) => isRequirementSelectedOrIrrelevant(node.requirementFilterOption))
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)
    const filteredEnergyNodes = talentTree.energyNodes
      .filter((node) => isRequirementSelectedOrIrrelevant(node.requirementFilterOption))
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)
    const filteredEventNodes = talentTree.eventNodes
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)
    const filteredOfferNodes = talentTree.offerNode.children
      .map((node) => filterTalentTreeNode(node, matchingTalentNames))
      .filter(isNotNullOrUndefined)

    const filteredTree: TalentTree = {
      noReqNode: {
        ...talentTree.noReqNode,
        children: filteredTalentNodes,
      },
      classNodes: filteredClassNodes,
      energyNodes: filteredEnergyNodes,
      eventNodes: filteredEventNodes,
      offerNode: {
        ...talentTree.offerNode,
        children: filteredOfferNodes,
      },
    }

    if (!matchingTalentTree || !isTalentTreeEqual(filteredTree, matchingTalentTree)) {
      setMatchingTalentTree(filteredTree)
    }
  }, [
    collectMatchingTalentNames,
    filterTalentTreeNode,
    isMatchingTalent,
    isRequirementSelectedOrIrrelevant,
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
    useRequirementFilters: trackedUseRequirementFilters,
    useExtraTalentFilters: trackedUseExtraTalentFilters,
    useFormattingFilters: trackedUseFormattingFilters,
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
