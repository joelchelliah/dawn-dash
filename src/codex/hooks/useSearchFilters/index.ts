import { useEffect, useRef, useState, useCallback } from 'react'

import { isNotNullOrUndefined } from '@/shared/utils/object'
import { isArrayEqual } from '@/shared/utils/lists'

import {
  TalentTree,
  TalentTreeNode,
  TalentTreeNodeType,
  TalentTreeRequirementNode,
  TalentTreeTalentNode,
} from '@/codex/types/talents'
import { WeeklyChallengeFilterData } from '@/codex/types/filters'
import {
  hasMonsterBanner,
  hasMonsterExpansion,
  hasMonsterRarity,
  isNonCollectibleMonsterCard,
  isNonCollectibleRegularCard,
} from '@/codex/utils/cardHelper'
import { CardData } from '@/codex/types/cards'
import {
  cacheCardCodexSearchFilters,
  cacheTalentCodexSearchFilters,
  getCachedCardCodexSearchFilters,
  getCachedTalentCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'
import { isEventBasedTalent, isOffer } from '@/codex/utils/talentHelper'

import { useWeeklyChallengeFilterData } from '../useWeeklyChallengeFilterData'

import { useCardSetFilters } from './useCardSetFilters'
import { useRarityFilters } from './useRarityFilters'
import { useBannerFilters } from './useBannerFilters'
import { useExtraFilters } from './useExtraFilters'
import { useFormattingFilters } from './useFormattingFilters'
import { useCardStrike } from './useCardStrike'
import { useTierFilters } from './useTierFilters'
import { useKeywords } from './useKeywords'
import { useTalentExtraFilters } from './useTalentExtraFilters'

export interface UseCardSearchFilters {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  matchingCards: CardData[]
  useCardSetFilters: ReturnType<typeof useCardSetFilters>
  useRarityFilters: ReturnType<typeof useRarityFilters>
  useBannerFilters: ReturnType<typeof useBannerFilters>
  useExtraFilters: ReturnType<typeof useExtraFilters>
  useFormattingFilters: ReturnType<typeof useFormattingFilters>
  useCardStrike: ReturnType<typeof useCardStrike>
  resetFilters: () => void
  resetStruckCards: () => void
  setFiltersFromWeeklyChallengeData: () => void
  weeklyChallengeData: WeeklyChallengeFilterData | null
  isWeelyChallengeLoading: boolean
  isWeeklyChallengeError: boolean
}

export interface UseTalentSearchFilters {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  matchingTalentTree: TalentTree | undefined
  useCardSetFilters: ReturnType<typeof useCardSetFilters>
  useTierFilters: ReturnType<typeof useTierFilters>
  useTalentExtraFilters: ReturnType<typeof useTalentExtraFilters>
  resetFilters: () => void
}

export const useCardSearchFilters = (cardData: CardData[] | undefined): UseCardSearchFilters => {
  const cachedFilters = getCachedCardCodexSearchFilters()
  const { filterData, isFilterDataError, isFilterDataLoading } = useWeeklyChallengeFilterData()
  const {
    keywords,
    setKeywords: setKeywordsUntracked,
    parsedKeywords,
    resetParsedKeywords,
  } = useKeywords(cachedFilters?.keywords)
  const [matchingCards, setMatchingCards] = useState<CardData[]>([])

  const untrackedUseCardSetFilters = useCardSetFilters(cachedFilters?.cardSets)
  const untrackedUseRarityFilters = useRarityFilters(cachedFilters?.rarities)
  const untrackedUseBannerFilters = useBannerFilters(cachedFilters?.banners)
  const untrackedUseExtraFilters = useExtraFilters(cachedFilters?.extras)
  const untrackedUseFormattingFilters = useFormattingFilters(cachedFilters?.formatting)
  const untrackedUseCardStrike = useCardStrike(cachedFilters?.struckCards)

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

  const trackedUseRarityFilters = {
    ...untrackedUseRarityFilters,
    handleRarityFilterToggle: (rarity: string) => {
      hasUserChangedFilter.current = true
      untrackedUseRarityFilters.handleRarityFilterToggle(rarity)
    },
  }

  const trackedUseBannerFilters = {
    ...untrackedUseBannerFilters,
    handleBannerFilterToggle: (banner: string) => {
      hasUserChangedFilter.current = true
      untrackedUseBannerFilters.handleBannerFilterToggle(banner)
    },
  }

  const trackedUseExtraFilters = {
    ...untrackedUseExtraFilters,
    handleExtraFilterToggle: (extra: string) => {
      hasUserChangedFilter.current = true
      untrackedUseExtraFilters.handleExtraFilterToggle(extra)
    },
  }

  const trackedUseFormattingFilters = {
    ...untrackedUseFormattingFilters,
    handleFormattingFilterToggle: (formatting: string) => {
      hasUserChangedFilter.current = true
      untrackedUseFormattingFilters.handleFormattingFilterToggle(formatting)
    },
  }

  const trackedUseCardStrike = {
    ...untrackedUseCardStrike,
    toggleCardStrike: (card: CardData) => {
      hasUserChangedFilter.current = true
      untrackedUseCardStrike.toggleCardStrike(card)
    },
  }
  // --------------------------------------------------
  // --------------------------------------------------

  const { shouldIncludeMonsterCards, shouldIncludeNonCollectibleCards } = trackedUseExtraFilters
  const { cardSetFilters, isCardSetIndexSelected, enableCardSetFilters, resetCardSetFilters } =
    trackedUseCardSetFilters
  const { rarityFilters, isRarityIndexSelected, resetRarityFilters } = trackedUseRarityFilters
  const { bannerFilters, isBannerIndexSelected, enableBannerFilters, resetBannerFilters } =
    trackedUseBannerFilters
  const { extraFilters, resetExtraFilters } = trackedUseExtraFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters
  const { struckCards, resetStruckCards } = trackedUseCardStrike

  const resetFilters = () => {
    trackedSetKeywords('')
    resetParsedKeywords()
    resetCardSetFilters()
    resetRarityFilters()
    resetBannerFilters()
    resetExtraFilters()
    resetFormattingFilters()
  }

  // --------------------------------------------------
  // --------------- Weekly Challenge! ----------------
  // --------------------------------------------------

  const setFiltersFromWeeklyChallengeData = () => {
    if (filterData && !isFilterDataError) {
      hasUserChangedFilter.current = true
      setKeywordsUntracked(
        Array.from(
          new Set([...Array.from(filterData.keywords), ...Array.from(filterData.specialKeywords)])
        ).join(', ')
      )

      enableCardSetFilters(Array.from(filterData.cardSets))
      enableBannerFilters(Array.from(filterData.banners))
    }
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
      cacheCardCodexSearchFilters({
        keywords,
        cardSets: cardSetFilters,
        rarities: rarityFilters,
        banners: bannerFilters,
        extras: extraFilters,
        formatting: formattingFilters,
        struckCards,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [
    bannerFilters,
    cardSetFilters,
    extraFilters,
    formattingFilters,
    keywords,
    rarityFilters,
    struckCards,
  ])

  // --------------------------------------------------
  // ------------- Filtering logic --------------------
  // --------------------------------------------------

  useEffect(() => {
    if (cardData) {
      const filteredCards = cardData
        .filter((card) =>
          hasMonsterExpansion(card)
            ? shouldIncludeMonsterCards
            : isCardSetIndexSelected(card.expansion)
        )
        .filter((card) =>
          hasMonsterRarity(card) ? shouldIncludeMonsterCards : isRarityIndexSelected(card.rarity)
        )
        .filter((card) =>
          hasMonsterBanner(card) ? shouldIncludeMonsterCards : isBannerIndexSelected(card.color)
        )
        .filter((card) => {
          if (isNonCollectibleRegularCard(card)) {
            return shouldIncludeNonCollectibleCards || !isNonCollectibleRegularCard(card)
          }
          if (isNonCollectibleMonsterCard(card)) {
            return shouldIncludeNonCollectibleCards && shouldIncludeMonsterCards
          }

          return true
        })
        .filter((card) => isNameOrDescriptionIncluded(card, parsedKeywords))

      if (!isArrayEqual(filteredCards, matchingCards, 'name')) {
        setMatchingCards(filteredCards)
      }
    }
  }, [
    cardData,
    isBannerIndexSelected,
    isCardSetIndexSelected,
    isRarityIndexSelected,
    parsedKeywords,
    matchingCards,
    shouldIncludeMonsterCards,
    shouldIncludeNonCollectibleCards,
  ])
  // --------------------------------------------------
  // --------------------------------------------------

  return {
    keywords,
    setKeywords: trackedSetKeywords,
    parsedKeywords,
    matchingCards,
    useCardSetFilters: trackedUseCardSetFilters,
    useRarityFilters: trackedUseRarityFilters,
    useBannerFilters: trackedUseBannerFilters,
    useExtraFilters: trackedUseExtraFilters,
    useFormattingFilters: trackedUseFormattingFilters,
    useCardStrike: trackedUseCardStrike,
    resetFilters,
    resetStruckCards,
    setFiltersFromWeeklyChallengeData,
    weeklyChallengeData: filterData,
    isWeelyChallengeLoading: isFilterDataLoading,
    isWeeklyChallengeError: isFilterDataError,
  }
}

export const useTalentSearchFilters = (
  talentTree: TalentTree | undefined
): UseTalentSearchFilters => {
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
  const untrackedUseTalentExtraFilters = useTalentExtraFilters(cachedFilters?.extras)
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

  const trackedUseTalentExtraFilters = {
    ...untrackedUseTalentExtraFilters,
    handleTalentExtraFilterToggle: (talentExtra: string) => {
      hasUserChangedFilter.current = true
      untrackedUseTalentExtraFilters.handleTalentExtraFilterToggle(talentExtra)
    },
  }
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, isCardSetIndexSelected, resetCardSetFilters } = trackedUseCardSetFilters
  const { tierFilters, isTierIndexSelected, resetTierFilters } = trackedUseTierFilters
  const {
    talentExtraFilters,
    shouldIncludeOffers,
    shouldIncludeEventBasedTalents,
    resetTalentExtraFilters,
  } = trackedUseTalentExtraFilters

  const resetFilters = () => {
    trackedSetKeywords('')
    resetParsedKeywords()
    resetCardSetFilters()
    resetTierFilters()
    resetTalentExtraFilters()
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
        extras: talentExtraFilters,
        lastUpdated: Date.now(),
      })
    }, 1000)

    return () => {
      if (filterDebounceTimeoutRef.current) {
        clearTimeout(filterDebounceTimeoutRef.current)
      }
    }
  }, [cardSetFilters, tierFilters, keywords, talentExtraFilters])

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

  const filterTalentTreeNode = useCallback(function <
    T extends TalentTreeTalentNode | TalentTreeRequirementNode,
  >(node: T, matchingTalentNames: Set<string>): T | null {
    const filteredChildren = node.children
      .map((child) => filterTalentTreeNode(child, matchingTalentNames))
      .filter(isNotNullOrUndefined)

    const shouldInclude =
      node.type === TalentTreeNodeType.TALENT
        ? matchingTalentNames.has(node.name) || filteredChildren.length > 0
        : filteredChildren.length > 0

    return shouldInclude ? ({ ...node, children: filteredChildren } as T) : null
  }, [])

  useEffect(() => {
    if (talentTree) {
      const filterFn = (node: TalentTreeTalentNode) =>
        isCardSetIndexSelected(node.expansion) &&
        isTierIndexSelected(node.tier) &&
        (shouldIncludeOffers || !isOffer(node)) &&
        (shouldIncludeEventBasedTalents || !isEventBasedTalent(node)) &&
        isNameOrDescriptionIncluded(node, parsedKeywords)

      const matchingTalentNames = collectMatchingTalentNames(talentTree, filterFn)

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
    }
  }, [
    talentTree,
    isCardSetIndexSelected,
    isTierIndexSelected,
    parsedKeywords,
    matchingTalentTree,
    filterTalentTreeNode,
    collectMatchingTalentNames,
    shouldIncludeOffers,
    shouldIncludeEventBasedTalents,
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
    useTalentExtraFilters: trackedUseTalentExtraFilters,
    resetFilters,
  }
}

const isNameOrDescriptionIncluded = (
  { name, description }: CardData | TalentTreeTalentNode,
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
