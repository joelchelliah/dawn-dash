import { useEffect, useMemo, useRef } from 'react'

import { TalentTree, TalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import {
  cacheTalentCodexSearchFilters,
  getCachedTalentCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'

import { useTalentCardSetFilters } from './useCardSetFilters'
import { useTierFilters } from './useTierFilters'
import { useKeywords } from './useKeywords'
import { useFilterTracking } from './useFilterTracking'
import { useFormattingTalentFilters } from './useFormattingTalentFilters'
import { useRequirementFilters } from './useRequirementFilters'
import { filterTalentTree, TalentFilterCriteria } from './talentTreeFilter'

export interface UseAllTalentSearchFilters {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  matchingTalentTree: TalentTree | undefined
  matchingTalentNames: string[]
  useCardSetFilters: ReturnType<typeof useTalentCardSetFilters>
  useRequirementFilters: ReturnType<typeof useRequirementFilters>
  useTierFilters: ReturnType<typeof useTierFilters>
  useFormattingFilters: ReturnType<typeof useFormattingTalentFilters>
  resetFilters: () => void
}

const collectDistinctTalentNames = (tree: TalentTree | undefined): string[] => {
  if (!tree) return []

  const names = new Set<string>()

  const traverse = (nodes: TalentTreeNode[]) => {
    for (const node of nodes) {
      if (node.type === TalentTreeNodeType.TALENT) names.add(node.name)
      traverse(node.children)
    }
  }

  traverse([
    ...(tree.noReqNode.children ?? []),
    ...(tree.energyNodes ?? []),
    ...(tree.classNodes ?? []),
    ...tree.eventNodes.flatMap((node) => node.children),
    ...(tree.offerNode.children ?? []),
    ...(tree.unavailableNode.children ?? []),
  ])

  return Array.from(names)
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

  const untrackedUseCardSetFilters = useTalentCardSetFilters(cachedFilters?.cardSets)
  const untrackedUseRequirementFilters = useRequirementFilters(cachedFilters?.requirements)
  const untrackedUseTierFilters = useTierFilters(cachedFilters?.tiers)
  const untrackedUseFormattingFilters = useFormattingTalentFilters(cachedFilters?.formatting)
  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedFilter, createTrackedSetter } = useFilterTracking()

  const TRACKED_FILTER_HANDLERS = {
    cardSet: ['handleCardSetFilterToggle', 'resetCardSetFilters'] as const,
    requirement: ['handleRequirementFilterToggle', 'resetRequirementFilters'] as const,
    tier: ['handleTierFilterToggle', 'resetTierFilters'] as const,
    formatting: ['handleFormattingFilterToggle', 'resetFormattingFilters'] as const,
  } as const

  const trackedSetKeywords = createTrackedSetter(setKeywordsUntracked)

  const trackedUseCardSetFilters = createTrackedFilter(untrackedUseCardSetFilters, [
    ...TRACKED_FILTER_HANDLERS.cardSet,
  ])
  const trackedUseRequirementFilters = createTrackedFilter(untrackedUseRequirementFilters, [
    ...TRACKED_FILTER_HANDLERS.requirement,
  ])
  const trackedUseTierFilters = createTrackedFilter(untrackedUseTierFilters, [
    ...TRACKED_FILTER_HANDLERS.tier,
  ])
  const trackedUseFormattingFilters = createTrackedFilter(untrackedUseFormattingFilters, [
    ...TRACKED_FILTER_HANDLERS.formatting,
  ])
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, isCardSetIndexSelected, resetCardSetFilters } = trackedUseCardSetFilters
  const { requirementFilters, isRequirementSelected, resetRequirementFilters } =
    trackedUseRequirementFilters
  const { tierFilters, isTierIndexSelected, resetTierFilters } = trackedUseTierFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters

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
  const filterCriteria = useMemo<TalentFilterCriteria>(
    () => ({
      parsedKeywords,
      isCardSetIndexSelected,
      isTierIndexSelected,
      isRequirementSelected,
    }),
    [parsedKeywords, isCardSetIndexSelected, isTierIndexSelected, isRequirementSelected]
  )

  const matchingTalentTree = useMemo(
    () => (talentTree ? filterTalentTree(talentTree, filterCriteria) : undefined),
    [talentTree, filterCriteria]
  )

  const matchingTalentNames = useMemo(
    () => collectDistinctTalentNames(matchingTalentTree),
    [matchingTalentTree]
  )
  // --------------------------------------------------
  // --------------------------------------------------

  return {
    keywords,
    setKeywords: trackedSetKeywords,
    parsedKeywords,
    matchingTalentTree,
    matchingTalentNames,
    useCardSetFilters: trackedUseCardSetFilters,
    useTierFilters: trackedUseTierFilters,
    useRequirementFilters: trackedUseRequirementFilters,
    useFormattingFilters: trackedUseFormattingFilters,
    resetFilters,
  }
}
