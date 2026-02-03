import { useCallback, useEffect, useRef, useState } from 'react'

import { isArrayEqual } from '@/shared/utils/lists'

import { WeeklyChallengeFilterData } from '@/codex/types/filters'
import {
  hasMonsterBanner,
  hasMonsterExpansion,
  hasMonsterRarity,
  isAnimalCompanionCard,
  isNonCollectibleMonsterCard,
  isNonCollectibleRegularCard,
} from '@/codex/utils/cardHelper'
import { CardData } from '@/codex/types/cards'
import {
  cacheCardCodexSearchFilters,
  getCachedCardCodexSearchFilters,
} from '@/codex/utils/codexFilterStore'

import { useWeeklyChallengeFilterData } from '../useWeeklyChallengeFilterData'

import { useCardSetFilters } from './useCardSetFilters'
import { useRarityFilters } from './useRarityFilters'
import { useBannerFilters } from './useBannerFilters'
import { useExtraCardFilters } from './useExtraCardFilters'
import { useFormattingCardFilters } from './useFormattingCardFilters'
import { useCardStrike } from './useCardStrike'
import { useKeywords } from './useKeywords'
import { useFilterTracking } from './useFilterTracking'

export interface UseAllCardSearchFilters {
  keywords: string
  setKeywords: (keywords: string) => void
  parsedKeywords: string[]
  matchingCards: CardData[]
  useCardSetFilters: ReturnType<typeof useCardSetFilters>
  useRarityFilters: ReturnType<typeof useRarityFilters>
  useBannerFilters: ReturnType<typeof useBannerFilters>
  useExtraCardFilters: ReturnType<typeof useExtraCardFilters>
  useFormattingFilters: ReturnType<typeof useFormattingCardFilters>
  useCardStrike: ReturnType<typeof useCardStrike>
  resetFilters: () => void
  resetStruckCards: () => void
  setFiltersFromWeeklyChallengeData: () => void
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
  const [matchingCards, setMatchingCards] = useState<CardData[]>([])

  const untrackedUseCardSetFilters = useCardSetFilters(cachedFilters?.cardSets)
  const untrackedUseRarityFilters = useRarityFilters(cachedFilters?.rarities)
  const untrackedUseBannerFilters = useBannerFilters(cachedFilters?.banners)
  const untrackedUseExtraCardFilters = useExtraCardFilters(cachedFilters?.extras)
  const untrackedUseFormattingFilters = useFormattingCardFilters(cachedFilters?.formatting)
  const untrackedUseCardStrike = useCardStrike(cachedFilters?.struckCards)

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedFilter, createTrackedSetter } = useFilterTracking()

  const TRACKED_FILTER_HANDLER = {
    cardSet: 'handleCardSetFilterToggle' as const,
    rarity: 'handleRarityFilterToggle' as const,
    banner: 'handleBannerFilterToggle' as const,
    extraCard: 'handleExtraCardFilterToggle' as const,
    formatting: 'handleFormattingFilterToggle' as const,
    cardStrike: 'toggleCardStrike' as const,
  } as const

  const trackedSetKeywords = createTrackedSetter(setKeywordsUntracked)

  const trackedUseCardSetFilters = createTrackedFilter(
    untrackedUseCardSetFilters,
    TRACKED_FILTER_HANDLER.cardSet
  )
  const trackedUseRarityFilters = createTrackedFilter(
    untrackedUseRarityFilters,
    TRACKED_FILTER_HANDLER.rarity
  )
  const trackedUseBannerFilters = createTrackedFilter(
    untrackedUseBannerFilters,
    TRACKED_FILTER_HANDLER.banner
  )
  const trackedUseExtraCardFilters = createTrackedFilter(
    untrackedUseExtraCardFilters,
    TRACKED_FILTER_HANDLER.extraCard
  )
  const trackedUseFormattingFilters = createTrackedFilter(
    untrackedUseFormattingFilters,
    TRACKED_FILTER_HANDLER.formatting
  )
  const trackedUseCardStrike = createTrackedFilter(
    untrackedUseCardStrike,
    TRACKED_FILTER_HANDLER.cardStrike
  )
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, isCardSetIndexSelected, enableCardSetFilters, resetCardSetFilters } =
    trackedUseCardSetFilters
  const { rarityFilters, isRarityIndexSelected, resetRarityFilters } = trackedUseRarityFilters
  const { bannerFilters, isBannerIndexSelected, enableBannerFilters, resetBannerFilters } =
    trackedUseBannerFilters
  const {
    extraCardFilters,
    shouldIncludeMonsterCards,
    shouldIncludeAnimalCompanionCards,
    shouldIncludeNonCollectibleCards,
    resetExtraCardFilters,
  } = trackedUseExtraCardFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters
  const { struckCards, resetStruckCards } = trackedUseCardStrike

  const resetFilters = () => {
    trackedSetKeywords('')
    resetParsedKeywords()
    resetCardSetFilters()
    resetRarityFilters()
    resetBannerFilters()
    resetExtraCardFilters()
    resetFormattingFilters()
  }

  // --------------------------------------------------
  // --------------- Weekly Challenge! ----------------
  // --------------------------------------------------

  const setFiltersFromWeeklyChallengeData = () => {
    if (filterData && !isFilterDataError) {
      trackedSetKeywords(
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
    (card: CardData) => {
      const passesExpansionFilter = hasMonsterExpansion(card)
        ? shouldIncludeMonsterCards
        : isCardSetIndexSelected(card.expansion)
      const passesRarityFilter = hasMonsterRarity(card)
        ? shouldIncludeMonsterCards
        : isRarityIndexSelected(card.rarity)
      const passesBannerFilter = hasMonsterBanner(card)
        ? shouldIncludeMonsterCards
        : isBannerIndexSelected(card.color)

      const passesAnimalCompanionFilter = isAnimalCompanionCard(card)
        ? shouldIncludeAnimalCompanionCards
        : true

      const passesCollectibilityFilter = (() => {
        if (isNonCollectibleRegularCard(card)) {
          return shouldIncludeNonCollectibleCards
        }
        if (isNonCollectibleMonsterCard(card)) {
          return shouldIncludeNonCollectibleCards && shouldIncludeMonsterCards
        }
        return true
      })()

      return (
        passesExpansionFilter &&
        passesRarityFilter &&
        passesBannerFilter &&
        passesAnimalCompanionFilter &&
        passesCollectibilityFilter &&
        isNameOrDescriptionIncluded(card, parsedKeywords)
      )
    },
    [
      shouldIncludeMonsterCards,
      isCardSetIndexSelected,
      isRarityIndexSelected,
      isBannerIndexSelected,
      shouldIncludeAnimalCompanionCards,
      shouldIncludeNonCollectibleCards,
      parsedKeywords,
    ]
  )

  useEffect(() => {
    if (cardData) {
      const filteredCards = cardData.filter(isMatchingCard)

      if (!isArrayEqual(filteredCards, matchingCards, 'name')) {
        setMatchingCards(filteredCards)
      }
    }
  }, [cardData, isMatchingCard, matchingCards])
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
