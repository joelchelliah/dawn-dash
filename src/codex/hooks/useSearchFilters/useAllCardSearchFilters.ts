import { useCallback, useEffect, useMemo, useRef } from 'react'

import { ExtraCardFilterOption, WeeklyChallengeFilterData } from '@/codex/types/filters'
import {
  hasMonsterBanner,
  hasMonsterRarity,
  hasMonsterType,
  isAnimalCompanionCard,
  isNonCollectible,
} from '@/codex/utils/cardHelper'
import { CardData } from '@/codex/types/cards'
import {
  cacheCardCodexSearchFilters,
  getCachedCardCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'

import { useWeeklyChallengeFilterData } from '../useWeeklyChallengeFilterData'

import { isCardSetIndexInSelection, useCardSetFilters } from './useCardSetFilters'
import { allRarities, useRarityFilters } from './useRarityFilters'
import { isBannerIndexInSelection, useBannerFilters } from './useBannerFilters'
import { allCardTypes, useCardTypeFilters } from './useCardTypeFilters'
import { useExtraCardFilters } from './useExtraCardFilters'
import { useFormattingCardFilters } from './useFormattingCardFilters'
import { useCardStrike } from './useCardStrike'
import { useKeywords } from './useKeywords'
import { useFilterTracking } from './useFilterTracking'

export interface WeeklyChallengeOptimization {
  parsedKeywords: string[]
  hasAnimalCompanionMatch: boolean
}

export interface UseAllCardSearchFilters {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  matchingCards: CardData[]
  useCardSetFilters: ReturnType<typeof useCardSetFilters>
  useRarityFilters: ReturnType<typeof useRarityFilters>
  useBannerFilters: ReturnType<typeof useBannerFilters>
  useCardTypeFilters: ReturnType<typeof useCardTypeFilters>
  useExtraCardFilters: ReturnType<typeof useExtraCardFilters>
  useFormattingFilters: ReturnType<typeof useFormattingCardFilters>
  useCardStrike: ReturnType<typeof useCardStrike>
  resetFilters: () => void
  resetStruckCards: () => void
  setFiltersFromWeeklyChallengeData: () => WeeklyChallengeOptimization | null
  weeklyChallengeData: WeeklyChallengeFilterData | null
  isWeelyChallengeLoading: boolean
  isWeeklyChallengeError: boolean
}

export const useAllCardSearchFilters = (
  cardData: CardData[] | undefined
): UseAllCardSearchFilters => {
  const cachedFilters = getCachedCardCodexSearchFilters()
  const { filterData, isFilterDataError, isFilterDataLoading } = useWeeklyChallengeFilterData()
  const {
    keywords,
    setKeywords: setKeywordsUntracked,
    parsedKeywords,
    resetParsedKeywords,
  } = useKeywords(cachedFilters?.keywords)

  const untrackedUseCardSetFilters = useCardSetFilters(cachedFilters?.cardSets)
  const untrackedUseRarityFilters = useRarityFilters(cachedFilters?.rarities)
  const untrackedUseBannerFilters = useBannerFilters(cachedFilters?.banners)
  const untrackedUseCardTypeFilters = useCardTypeFilters(cachedFilters?.cardTypes)
  const untrackedUseExtraCardFilters = useExtraCardFilters(cachedFilters?.extras)
  const untrackedUseFormattingFilters = useFormattingCardFilters(cachedFilters?.formatting)
  const untrackedUseCardStrike = useCardStrike(cachedFilters?.struckCards)

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedFilter, createTrackedSetter } = useFilterTracking()

  const TRACKED_FILTER_HANDLERS = {
    cardSet: ['handleCardSetFilterToggle', 'enableCardSetFilters', 'resetCardSetFilters'] as const,
    rarity: ['handleRarityFilterToggle', 'enableRarityFilters', 'resetRarityFilters'] as const,
    banner: ['handleBannerFilterToggle', 'enableBannerFilters', 'resetBannerFilters'] as const,
    cardType: [
      'handleCardTypeFilterToggle',
      'enableCardTypeFilters',
      'resetCardTypeFilters',
    ] as const,
    extraCard: [
      'handleExtraCardFilterToggle',
      'enableExtraCardFilters',
      'resetExtraCardFilters',
    ] as const,
    formatting: ['handleFormattingFilterToggle', 'resetFormattingFilters'] as const,
    cardStrike: ['toggleCardStrike', 'undoLastTrackedCard', 'resetStruckCards'] as const,
  } as const

  const trackedSetKeywords = createTrackedSetter(setKeywordsUntracked)

  const trackedUseCardSetFilters = createTrackedFilter(untrackedUseCardSetFilters, [
    ...TRACKED_FILTER_HANDLERS.cardSet,
  ])
  const trackedUseRarityFilters = createTrackedFilter(untrackedUseRarityFilters, [
    ...TRACKED_FILTER_HANDLERS.rarity,
  ])
  const trackedUseBannerFilters = createTrackedFilter(untrackedUseBannerFilters, [
    ...TRACKED_FILTER_HANDLERS.banner,
  ])
  const trackedUseCardTypeFilters = createTrackedFilter(untrackedUseCardTypeFilters, [
    ...TRACKED_FILTER_HANDLERS.cardType,
  ])
  const trackedUseExtraCardFilters = createTrackedFilter(untrackedUseExtraCardFilters, [
    ...TRACKED_FILTER_HANDLERS.extraCard,
  ])
  const trackedUseFormattingFilters = createTrackedFilter(untrackedUseFormattingFilters, [
    ...TRACKED_FILTER_HANDLERS.formatting,
  ])
  const trackedUseCardStrike = createTrackedFilter(untrackedUseCardStrike, [
    ...TRACKED_FILTER_HANDLERS.cardStrike,
  ])
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, isCardSetIndexSelected, enableCardSetFilters, resetCardSetFilters } =
    trackedUseCardSetFilters
  const { rarityFilters, isRarityIndexSelected, enableRarityFilters, resetRarityFilters } =
    trackedUseRarityFilters
  const { bannerFilters, isBannerIndexSelected, enableBannerFilters, resetBannerFilters } =
    trackedUseBannerFilters
  const { cardTypeFilters, isCardTypeIndexSelected, enableCardTypeFilters, resetCardTypeFilters } =
    trackedUseCardTypeFilters
  const {
    extraCardFilters,
    shouldIncludeMonsterCards,
    shouldIncludeAnimalCompanionCards,
    shouldIncludeNonCollectibleCards,
    enableExtraCardFilters,
    resetExtraCardFilters,
  } = trackedUseExtraCardFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters
  const { struckCards, resetStruckCards } = trackedUseCardStrike

  // Same tracking requirement as `setFiltersFromWeeklyChallengeData` below
  const resetFilters = () => {
    trackedSetKeywords('')
    resetParsedKeywords()
    resetCardSetFilters()
    resetRarityFilters()
    resetBannerFilters()
    resetCardTypeFilters()
    resetExtraCardFilters()
    resetFormattingFilters()
  }

  // --------------------------------------------------
  // --------------- Weekly Challenge! ----------------
  // --------------------------------------------------

  // Bulk-sets several filters at once, so every setter it calls has to be a tracked one
  // (see `TRACKED_FILTER_HANDLERS`) — otherwise the optimization applies visibly but never
  // reaches the filter cache, and reverts on the next page load.
  //
  // Returns what it applied.
  // inspect the optimized result must read it from the return value, NOT from `parsedKeywords` and `matchingCards`.
  const setFiltersFromWeeklyChallengeData = (): WeeklyChallengeOptimization | null => {
    if (!filterData || isFilterDataError) return null

    const newParsedKeywords = Array.from(
      new Set([...Array.from(filterData.keywords), ...Array.from(filterData.specialKeywords)])
    )
    const newCardSets = Array.from(filterData.cardSets)
    const newBanners = Array.from(filterData.banners)

    trackedSetKeywords(newParsedKeywords.join(', '))

    enableCardSetFilters(newCardSets)
    enableBannerFilters(newBanners)
    enableRarityFilters(allRarities)
    enableCardTypeFilters(allCardTypes)

    // Non-collectible cards can never show up in a weekly challenge, for now...
    enableExtraCardFilters(
      Object.keys(extraCardFilters).filter(
        (filter) =>
          filter !== ExtraCardFilterOption.IncludeNonCollectibleCards && extraCardFilters[filter]
      )
    )

    return {
      parsedKeywords: newParsedKeywords,
      hasAnimalCompanionMatch:
        shouldIncludeAnimalCompanionCards &&
        (cardData ?? []).some(
          (card) =>
            isAnimalCompanionCard(card) &&
            isCardMatching(card, {
              parsedKeywords: newParsedKeywords,
              isCardSetSelected: (index) => isCardSetIndexInSelection(index, newCardSets),
              isBannerSelected: (index) => isBannerIndexInSelection(index, newBanners),
              isRaritySelected: () => true,
              isCardTypeSelected: () => true,
              shouldIncludeMonsterCards,
              shouldIncludeAnimalCompanionCards,
              shouldIncludeNonCollectibleCards: false,
            })
        ),
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
        cardTypes: cardTypeFilters,
        extras: extraCardFilters,
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
    cardTypeFilters,
    extraCardFilters,
    formattingFilters,
    hasUserChangedFilter,
    keywords,
    rarityFilters,
    struckCards,
  ])

  // --------------------------------------------------
  // ------------- Filtering logic --------------------
  // --------------------------------------------------

  const isMatchingCard = useCallback(
    (card: CardData) =>
      isCardMatching(card, {
        parsedKeywords,
        isCardSetSelected: isCardSetIndexSelected,
        isBannerSelected: isBannerIndexSelected,
        isRaritySelected: isRarityIndexSelected,
        isCardTypeSelected: isCardTypeIndexSelected,
        shouldIncludeMonsterCards,
        shouldIncludeAnimalCompanionCards,
        shouldIncludeNonCollectibleCards,
      }),
    [
      shouldIncludeMonsterCards,
      isCardSetIndexSelected,
      isRarityIndexSelected,
      isBannerIndexSelected,
      isCardTypeIndexSelected,
      shouldIncludeAnimalCompanionCards,
      shouldIncludeNonCollectibleCards,
      parsedKeywords,
    ]
  )

  const matchingCards = useMemo(
    () => (cardData ? cardData.filter(isMatchingCard) : []),
    [cardData, isMatchingCard]
  )
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
    useCardTypeFilters: trackedUseCardTypeFilters,
    useExtraCardFilters: trackedUseExtraCardFilters,
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

interface CardMatchingFilters {
  parsedKeywords: string[]
  isCardSetSelected: (index: number) => boolean
  isBannerSelected: (index: number) => boolean
  isRaritySelected: (index: number) => boolean
  isCardTypeSelected: (index: number) => boolean
  shouldIncludeMonsterCards: boolean
  shouldIncludeAnimalCompanionCards: boolean
  shouldIncludeNonCollectibleCards: boolean
}

/*
 * The card matching rules, taking every filter as an argument rather than closing over hook state,
 * so the same rules can be applied to filters that have not been committed to state yet.
 */
const isCardMatching = (
  card: CardData,
  {
    parsedKeywords,
    isCardSetSelected,
    isBannerSelected,
    isRaritySelected,
    isCardTypeSelected,
    shouldIncludeMonsterCards,
    shouldIncludeAnimalCompanionCards,
    shouldIncludeNonCollectibleCards,
  }: CardMatchingFilters
): boolean => {
  // Note: Nil expansion cards are selected by the Core checkbox — see `useCardSetFilters`.
  const passesExpansionFilter = isCardSetSelected(card.expansion)
  const passesRarityFilter = hasMonsterRarity(card)
    ? shouldIncludeMonsterCards
    : isRaritySelected(card.rarity)
  const passesBannerFilter = hasMonsterBanner(card)
    ? shouldIncludeMonsterCards
    : isBannerSelected(card.color)
  const passesCardTypeFilter = hasMonsterType(card)
    ? shouldIncludeMonsterCards
    : isCardTypeSelected(card.type)

  const passesAnimalCompanionFilter = isAnimalCompanionCard(card)
    ? shouldIncludeAnimalCompanionCards
    : true

  const passesCollectibilityFilter = isNonCollectible(card)
    ? shouldIncludeNonCollectibleCards
    : true

  return (
    passesExpansionFilter &&
    passesRarityFilter &&
    passesBannerFilter &&
    passesCardTypeFilter &&
    passesAnimalCompanionFilter &&
    passesCollectibilityFilter &&
    isNameOrDescriptionIncluded(card, parsedKeywords)
  )
}

const isNameOrDescriptionIncluded = (
  { name, description }: CardData,
  keywords: string[]
): boolean =>
  keywords.length === 0 ||
  keywords.some(
    (keyword) =>
      name.toLowerCase().includes(keyword.toLowerCase()) ||
      description.toLowerCase().includes(keyword.toLowerCase())
  )
