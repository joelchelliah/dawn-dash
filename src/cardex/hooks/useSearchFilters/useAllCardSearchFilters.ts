import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CardData } from '@/shared/types/cards'
import {
  isCardMatchingKeyword,
  RARITY_KEYWORDS,
  toRarityToken,
} from '@/shared/utils/keywordMatching'
import { useCodexUrlParams } from '@/shared/hooks/useCodexUrlParams'
import {
  cardSetUrlCodec,
  useCardSetFilters,
} from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import { useKeywords } from '@/shared/hooks/useSearchFilters/useKeywords'
import { useFilterTracking } from '@/shared/hooks/useSearchFilters/useFilterTracking'

import { ExtraCardFilterOption, WeeklyChallengeFilterData } from '@/cardex/types/cardFilters'
import {
  hasMonsterBanner,
  hasMonsterRarity,
  hasNoBanner,
  isAnimalCompanionCard,
  isNonCollectible,
} from '@/cardex/utils/cardHelper'
import {
  cacheCardCodexSearchFilters,
  getCachedCardCodexSearchFilters,
} from '@/cardex/utils/cardFilterStore'

import { useWeeklyChallengeFilterData } from '../useWeeklyChallengeFilterData'

import { allRarities, rarityUrlCodec, useRarityFilters } from './useRarityFilters'
import { bannerUrlCodec, useBannerFilters } from './useBannerFilters'
import { allCardTypes, cardTypeUrlCodec, useCardTypeFilters } from './useCardTypeFilters'
import { useExtraCardFilters } from './useExtraCardFilters'
import { useFormattingCardFilters } from './useFormattingCardFilters'
import { useCardStrike } from './useCardStrike'

export type WeeklyChallengeNotification =
  'untrackedCards' | 'specialKeywordRules' | 'specialKeywordRulesTextNotScored' | 'negativeKeywords'

export interface WeeklyChallengeOptimization {
  textKeywords: string[]
  rarityKeywords: string[]
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
  setFiltersFromWeeklyChallengeData: () => void
  weeklyChallengeData: WeeklyChallengeFilterData | null
  isWeelyChallengeLoading: boolean
  isWeeklyChallengeError: boolean
  isPendingWeeklyChallengeFromUrl: boolean
  weeklyChallengeNotifications: WeeklyChallengeNotification[]
  clearWeeklyChallengeNotification: () => void
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

  const getWeeklyChallengeNotifications = (
    optimization: WeeklyChallengeOptimization
  ): WeeklyChallengeNotification[] => {
    const lowercasedTextKeywords = optimization.textKeywords.map((keyword) => keyword.toLowerCase())
    // A rarity's word only scores in card text when some other keyword also covers it
    const isRarityTextNotScored = optimization.rarityKeywords.some(
      (rarity) => !lowercasedTextKeywords.includes(rarity.toLowerCase())
    )
    const hasRarityKeywords = optimization.rarityKeywords.length > 0

    const matches: Record<WeeklyChallengeNotification, boolean> = {
      untrackedCards: struckCards.length > 0,
      specialKeywordRules: hasRarityKeywords && !isRarityTextNotScored,
      specialKeywordRulesTextNotScored: hasRarityKeywords && isRarityTextNotScored,
      negativeKeywords: !!filterData?.hadNegativeKeywords,
    }
    return (Object.keys(matches) as WeeklyChallengeNotification[]).filter((key) => matches[key])
  }

  const [weeklyChallengeNotifications, setWeeklyChallengeNotifications] = useState<
    WeeklyChallengeNotification[]
  >([])

  const clearWeeklyChallengeNotification = useCallback(
    () => setWeeklyChallengeNotifications([]),
    []
  )

  /*
   * `?weekly` only records intent on arrival: the challenge data is fetched asynchronously, so the
   * preset is applied by the effect below once it lands. This lives here rather than in
   * `CardSearchPanel` because the panel is unmounted while the page shows its loading message —
   */
  const [isPendingWeeklyChallengeFromUrl, setIsPendingWeeklyChallengeFromUrl] = useState(false)

  const { setWeeklyChallengeParam } = useCodexUrlParams({
    keywords,
    setKeywords: trackedSetKeywords,
    filterBindings: [
      { codec: cardSetUrlCodec, filters: cardSetFilters, enableFilters: enableCardSetFilters },
      { codec: bannerUrlCodec, filters: bannerFilters, enableFilters: enableBannerFilters },
      { codec: rarityUrlCodec, filters: rarityFilters, enableFilters: enableRarityFilters },
      { codec: cardTypeUrlCodec, filters: cardTypeFilters, enableFilters: enableCardTypeFilters },
    ],
    resetFilters,
    onWeeklyParam: () => setIsPendingWeeklyChallengeFromUrl(true),
  })

  const applyWeeklyChallengeOptimization = () => {
    const optimization = setFiltersFromWeeklyChallengeData()
    if (!optimization) return

    setWeeklyChallengeNotifications(getWeeklyChallengeNotifications(optimization))
  }

  const applyWeeklyChallengeOptimizationFromButton = () => {
    applyWeeklyChallengeOptimization()
    setWeeklyChallengeParam()
  }

  const hasAppliedWeeklyFromUrlRef = useRef(false)

  useEffect(() => {
    if (!isPendingWeeklyChallengeFromUrl || hasAppliedWeeklyFromUrlRef.current) return
    if (isFilterDataLoading) return

    hasAppliedWeeklyFromUrlRef.current = true
    setIsPendingWeeklyChallengeFromUrl(false)

    // The fetch failed, so there is no preset to apply — the panel hides the button in this case.
    if (isFilterDataError || !filterData) return

    applyWeeklyChallengeOptimization()

    // `applyWeeklyChallengeOptimization` is recreated every render and the ref above already makes
    // this run exactly once, so listing it would only re-run a one-shot effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPendingWeeklyChallengeFromUrl, isFilterDataLoading, isFilterDataError, filterData])

  // --------------------------------------------------
  // --------------- Weekly Challenge! ----------------
  // --------------------------------------------------

  // Bulk-sets several filters at once, so every setter it calls has to be a tracked one
  // (see `TRACKED_FILTER_HANDLERS`) — otherwise the optimization applies visibly but never
  // reaches the filter cache, and reverts on the next page load.
  //
  // Returns what it applied: the setters above only commit on the next render, so callers
  // must read the optimized keywords from the return value, NOT from `parsedKeywords`.
  const setFiltersFromWeeklyChallengeData = (): WeeklyChallengeOptimization | null => {
    if (!filterData || isFilterDataError) return null

    // Only a capitalized rarity among the base scoring keywords scores by rarity rather than by
    // text. The same word in a `miscPointsRules` keyword is matched against card text as usual.
    const baseKeywords = Array.from(filterData.keywords)
    const rarityKeywords = baseKeywords.filter((keyword) => RARITY_KEYWORDS.includes(keyword))
    const textKeywords = Array.from(
      new Set([
        ...baseKeywords.filter((keyword) => !RARITY_KEYWORDS.includes(keyword)),
        ...Array.from(filterData.specialKeywords),
      ])
    )
    const newCardSets = Array.from(filterData.cardSets)
    const newBanners = Array.from(filterData.banners)

    trackedSetKeywords([...textKeywords, ...rarityKeywords.map(toRarityToken)].join(', '))

    enableCardSetFilters(newCardSets)
    enableBannerFilters(newBanners)
    enableRarityFilters(allRarities)
    enableCardTypeFilters(allCardTypes)

    // Non-collectible cards can never show up in a weekly challenge,
    // and animal companion cards never score in one.
    // A Monster rarity token matches nothing unless monster cards are included.
    const shouldIncludeMonsterCards = rarityKeywords.includes('Monster')
    enableExtraCardFilters(
      Object.keys(extraCardFilters).filter(
        (filter) =>
          filter !== ExtraCardFilterOption.IncludeNonCollectibleCards &&
          filter !== ExtraCardFilterOption.IncludeAnimalCompanionCards &&
          (extraCardFilters[filter] ||
            (filter === ExtraCardFilterOption.IncludeMonsterCards && shouldIncludeMonsterCards))
      )
    )

    return { textKeywords, rarityKeywords }
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
    setFiltersFromWeeklyChallengeData: applyWeeklyChallengeOptimizationFromButton,
    weeklyChallengeData: filterData,
    isWeelyChallengeLoading: isFilterDataLoading,
    isWeeklyChallengeError: isFilterDataError,
    isPendingWeeklyChallengeFromUrl,
    weeklyChallengeNotifications,
    clearWeeklyChallengeNotification,
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

// The card matching rules, taking every filter as an argument rather than closing over hook state.
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
  // Bannerless cards fall through the banner filter entirely
  const passesBannerFilter = hasNoBanner(card)
    ? true
    : hasMonsterBanner(card)
      ? shouldIncludeMonsterCards
      : isBannerSelected(card.color)
  /*
   * Unlike rarity 4 and banner 11, type 7 is not a card-wide monster marker!
   * Keying the deferral on the type would let the Type group veto monster cards
   * the user opted into.
   */
  const passesCardTypeFilter =
    hasMonsterRarity(card) || hasMonsterBanner(card)
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
    matchesAnyKeyword(card, parsedKeywords)
  )
}

const matchesAnyKeyword = (card: CardData, keywords: string[]): boolean =>
  keywords.length === 0 || keywords.some((keyword) => isCardMatchingKeyword(card, keyword))
