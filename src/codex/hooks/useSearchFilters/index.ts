import { useEffect, useRef, useState } from 'react'

import { WeeklyChallengeFilterData } from '../../types/filters'
import {
  hasMonsterBanner,
  hasMonsterExpansion,
  hasMonsterRarity,
  isNonCollectibleMonsterCard,
  isNonCollectibleRegularCard,
} from '../../utils/cardHelper'
import { isArrayEqual } from '../../../shared/utils/lists'
import { CardData } from '../../types/cards'
import {
  cacheCardCodexSearchFilters,
  getCachedCardCodexSearchFilters,
} from '../../utils/codexFilterStore'
import { useWeeklyChallengeFilterData } from '../useWeeklyChallengeFilterData'

import { useCardSetFilters } from './useCardSetFilters'
import { useRarityFilters } from './useRarityFilters'
import { useBannerFilters } from './useBannerFilters'
import { useExtraFilters } from './useExtraFilters'
import { useFormattingFilters } from './useFormattingFilters'
import { useCardStrike } from './useCardStrike'

export interface UseSearchFilters {
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

export const useSearchFilters = (cardData: CardData[] | undefined): UseSearchFilters => {
  const cachedFilters = getCachedCardCodexSearchFilters()
  const { filterData, isFilterDataError, isFilterDataLoading } = useWeeklyChallengeFilterData()

  const [keywords, setKeywordsUntracked] = useState(cachedFilters?.keywords || '')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
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
    setParsedKeywords([])
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
    const parsed = keywords
      .split(/,\s+or\s+|,\s*|\s+or\s+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    if (!isArrayEqual(parsedKeywords, parsed)) {
      setParsedKeywords(parsed)
    }

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
        .filter(
          ({ name, description }) =>
            parsed.length === 0 ||
            parsed.some(
              (keyword) =>
                name.toLowerCase().includes(keyword.toLowerCase()) ||
                description.toLowerCase().includes(keyword.toLowerCase())
            )
        )

      if (!isArrayEqual(filteredCards, matchingCards, 'name')) {
        setMatchingCards(filteredCards)
      }
    }
  }, [
    cardData,
    isBannerIndexSelected,
    isCardSetIndexSelected,
    isRarityIndexSelected,
    keywords,
    matchingCards,
    parsedKeywords,
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
