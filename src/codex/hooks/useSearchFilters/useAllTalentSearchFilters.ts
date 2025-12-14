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
import { isTalentInAnyEvents, isTalentInAnyCards, isTalentOffer } from '@/codex/utils/talentHelper'
import { isTalentTreeEqual } from '@/codex/utils/treeHelper'
import { RequirementFilterOption } from '@/codex/types/filters'

import { useCardSetFilters } from './useCardSetFilters'
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
  const untrackedUseFormattingFilters = useFormattingTalentFilters(cachedFilters?.formatting)
  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedFilter, createTrackedSetter } = useFilterTracking()

  const TRACKED_FILTER_HANDLER = {
    cardSet: 'handleCardSetFilterToggle' as const,
    requirement: 'handleRequirementFilterToggle' as const,
    tier: 'handleTierFilterToggle' as const,
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
  const trackedUseFormattingFilters = createTrackedFilter(
    untrackedUseFormattingFilters,
    TRACKED_FILTER_HANDLER.formatting
  )
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, isCardSetIndexSelected, resetCardSetFilters } = trackedUseCardSetFilters
  const { requirementFilters, isRequirementSelected, resetRequirementFilters } =
    trackedUseRequirementFilters
  const { tierFilters, isTierIndexSelected, resetTierFilters } = trackedUseTierFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters

  const shouldIncludeOffers = isRequirementSelected([RequirementFilterOption.Offer])
  const shouldIncludeEvents = isRequirementSelected([RequirementFilterOption.ObtainedFromEvents])
  const shouldIncludeCards = isRequirementSelected([RequirementFilterOption.ObtainedFromCards])

  const resetFilters = () => {
    trackedSetKeywords('')
    resetParsedKeywords()
    resetCardSetFilters()
    resetRequirementFilters()
    resetTierFilters()
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

  const hasMatchInDescendants = useCallback(
    (node: TalentTreeNode, targets: Set<string>): boolean => {
      if (node.type !== TalentTreeNodeType.TALENT) return false

      return node.descendants.some((descendant) => targets.has(descendant))
    },
    []
  )

  const traverseRegularTalentNodes = useCallback(
    (talentTree: TalentTree, visitTalent: (talent: TalentTreeTalentNode) => void) => {
      traverseNode(talentTree.noReqNode, visitTalent)
      talentTree.classNodes.forEach((node) => traverseNode(node, visitTalent))
      talentTree.classAndEnergyNodes.forEach((node) => traverseNode(node, visitTalent))
      talentTree.energyNodes.forEach((node) => traverseNode(node, visitTalent))
    },
    [traverseNode]
  )

  const traverseEventTalentNodes = useCallback(
    (talentTree: TalentTree, visitTalent: (talent: TalentTreeTalentNode) => void) => {
      talentTree.eventNodes.forEach((node) => traverseNode(node, visitTalent))
    },
    [traverseNode]
  )

  const traverseCardTalentNodes = useCallback(
    (talentTree: TalentTree, visitTalent: (talent: TalentTreeTalentNode) => void) => {
      talentTree.cardNodes.forEach((node) => traverseNode(node, visitTalent))
    },
    [traverseNode]
  )

  const traverseOfferNodes = useCallback(
    (talentTree: TalentTree, visitTalent: (talent: TalentTreeTalentNode) => void) => {
      traverseNode(talentTree.offerNode, visitTalent)
    },
    [traverseNode]
  )

  const regularNodePredicate = useCallback(
    (talent: TalentTreeTalentNode) => {
      return (
        isCardSetIndexSelected(talent.expansion) &&
        isTierIndexSelected(talent.tier) &&
        isNameOrDescriptionIncluded(talent, parsedKeywords)
      )
    },
    [isCardSetIndexSelected, isTierIndexSelected, parsedKeywords]
  )

  const eventTalentNodePredicate = useCallback(
    (talent: TalentTreeTalentNode) => {
      return (
        isTalentInAnyEvents(talent) &&
        isTierIndexSelected(talent.tier) &&
        isNameOrDescriptionIncluded(talent, parsedKeywords)
      )
    },
    [isTierIndexSelected, parsedKeywords]
  )
  const cardTalentNodePredicate = useCallback(
    (talent: TalentTreeTalentNode) => {
      return (
        isTalentInAnyCards(talent) &&
        isTierIndexSelected(talent.tier) &&
        isNameOrDescriptionIncluded(talent, parsedKeywords)
      )
    },
    [isTierIndexSelected, parsedKeywords]
  )

  const offerNodePredicate = useCallback(
    (talent: TalentTreeTalentNode) => {
      return (
        isTalentOffer(talent) &&
        isTierIndexSelected(talent.tier) &&
        isNameOrDescriptionIncluded(talent, parsedKeywords)
      )
    },
    [isTierIndexSelected, parsedKeywords]
  )

  type NodeTraversalContext = 'regular' | 'event' | 'card' | 'offer'

  const collectAllMatchingSets = useCallback(
    (talentTree: TalentTree) => {
      const regularMatches = new Set<string>()
      const eventMatches = new Set<string>()
      const cardMatches = new Set<string>()
      const offerMatches = new Set<string>()

      const traverseWithContext = (node: TalentTreeNode, nodeContext: NodeTraversalContext) => {
        if (node.type === TalentTreeNodeType.TALENT) {
          if (nodeContext === 'regular' && regularNodePredicate(node)) {
            regularMatches.add(node.name)
          } else if (nodeContext === 'event' && eventTalentNodePredicate(node)) {
            eventMatches.add(node.name)
          } else if (nodeContext === 'card' && cardTalentNodePredicate(node)) {
            cardMatches.add(node.name)
          } else if (nodeContext === 'offer' && offerNodePredicate(node)) {
            offerMatches.add(node.name)
          }
        }

        node.children.forEach((child) => traverseWithContext(child, nodeContext))
      }

      traverseWithContext(talentTree.noReqNode, 'regular')
      talentTree.classNodes.forEach((node) => traverseWithContext(node, 'regular'))
      talentTree.classAndEnergyNodes.forEach((node) => traverseWithContext(node, 'regular'))
      talentTree.energyNodes.forEach((node) => traverseWithContext(node, 'regular'))

      if (shouldIncludeEvents) {
        talentTree.eventNodes.forEach((node) => traverseWithContext(node, 'event'))
      }

      if (shouldIncludeCards) {
        talentTree.cardNodes.forEach((node) => traverseWithContext(node, 'card'))
      }

      if (shouldIncludeOffers) {
        traverseWithContext(talentTree.offerNode, 'offer')
      }

      const addAncestorsAndDescendants = (
        matches: Set<string>,
        traversalFn: (
          talentTree: TalentTree,
          visitTalent: (talent: TalentTreeTalentNode) => void
        ) => void
      ) => {
        const allMatches = new Set(matches)

        traversalFn(talentTree, (node) => {
          // Ancestor matching
          if (hasMatchInDescendants(node, matches)) {
            allMatches.add(node.name)
          }
          // Descendant matching - includes all children and deeper descendants
          if (matches.has(node.name)) {
            node.descendants.forEach((descendant) => allMatches.add(descendant))
          }
        })

        return allMatches
      }

      return {
        regularMatches: addAncestorsAndDescendants(regularMatches, traverseRegularTalentNodes),
        eventMatches: shouldIncludeEvents
          ? addAncestorsAndDescendants(eventMatches, traverseEventTalentNodes)
          : new Set<string>(),
        cardMatches: shouldIncludeCards
          ? addAncestorsAndDescendants(cardMatches, traverseCardTalentNodes)
          : new Set<string>(),
        offerMatches: shouldIncludeOffers
          ? addAncestorsAndDescendants(offerMatches, traverseOfferNodes)
          : new Set<string>(),
      }
    },
    [
      regularNodePredicate,
      eventTalentNodePredicate,
      cardTalentNodePredicate,
      offerNodePredicate,
      shouldIncludeEvents,
      shouldIncludeOffers,
      shouldIncludeCards,
      hasMatchInDescendants,
      traverseRegularTalentNodes,
      traverseEventTalentNodes,
      traverseCardTalentNodes,
      traverseOfferNodes,
    ]
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

  useEffect(() => {
    if (!talentTree) return

    const { regularMatches, eventMatches, cardMatches, offerMatches } =
      collectAllMatchingSets(talentTree)

    const filteredTalentNodes = isRequirementSelected(talentTree.noReqNode.requirementFilterOptions)
      ? talentTree.noReqNode.children
          .map((node) => filterTalentTreeNode(node, regularMatches))
          .filter(isNotNullOrUndefined)
      : []
    const filteredClassNodes = talentTree.classNodes
      .filter((node) => isRequirementSelected(node.requirementFilterOptions))
      .map((node) => filterTalentTreeNode(node, regularMatches))
      .filter(isNotNullOrUndefined)
    const filteredClassAndEnergyNodes = talentTree.classAndEnergyNodes
      .filter((node) => isRequirementSelected(node.requirementFilterOptions))
      .map((node) => filterTalentTreeNode(node, regularMatches))
      .filter(isNotNullOrUndefined)
    const filteredEnergyNodes = talentTree.energyNodes
      .filter((node) => isRequirementSelected(node.requirementFilterOptions))
      .map((node) => filterTalentTreeNode(node, regularMatches))
      .filter(isNotNullOrUndefined)
    const filteredEventNodes = shouldIncludeEvents
      ? talentTree.eventNodes
          .map((node) => filterTalentTreeNode(node, eventMatches))
          .filter(isNotNullOrUndefined)
      : []
    const filteredCardNodes = shouldIncludeCards
      ? talentTree.cardNodes
          .map((node) => filterTalentTreeNode(node, cardMatches))
          .filter(isNotNullOrUndefined)
      : []
    const filteredOfferNodes = shouldIncludeOffers
      ? talentTree.offerNode.children
          .map((node) => filterTalentTreeNode(node, offerMatches))
          .filter(isNotNullOrUndefined)
      : []

    const filteredTree: TalentTree = {
      noReqNode: {
        ...talentTree.noReqNode,
        children: filteredTalentNodes,
      },
      classNodes: filteredClassNodes,
      classAndEnergyNodes: filteredClassAndEnergyNodes,
      energyNodes: filteredEnergyNodes,
      eventNodes: filteredEventNodes,
      cardNodes: filteredCardNodes,
      offerNode: {
        ...talentTree.offerNode,
        children: filteredOfferNodes,
      },
    }

    if (!matchingTalentTree || !isTalentTreeEqual(filteredTree, matchingTalentTree)) {
      setMatchingTalentTree(filteredTree)
    }
  }, [
    collectAllMatchingSets,
    filterTalentTreeNode,
    isRequirementSelected,
    matchingTalentTree,
    shouldIncludeEvents,
    shouldIncludeCards,
    shouldIncludeOffers,
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
