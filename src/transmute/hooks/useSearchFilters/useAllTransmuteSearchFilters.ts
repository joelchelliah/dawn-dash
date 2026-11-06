import { useEffect, useRef, useState } from 'react'

import { CardData } from '@/shared/types/cards'
import {
  cardSetUrlCodec,
  useTransmuteCardSetFilters,
} from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import { useFilterTracking } from '@/shared/hooks/useSearchFilters/useFilterTracking'
import { useFilterUrlParams } from '@/shared/hooks/useFilterUrlParams'

import { TransmuteMode } from '@/transmute/types/rules'
import {
  ALL_DIRECTIONS,
  ALL_MODES,
  DEFAULT_DIRECTION,
  DEFAULT_MODE,
  TransmuteDirection,
} from '@/transmute/types/filters'
import {
  cacheTransmuteSearchFilters,
  getCachedTransmuteSearchFilters,
} from '@/transmute/utils/transmuteFilterStore'
import { TransmuteCards } from '@/transmute/utils/transmuteCards'
import {
  CARD_PARAM,
  decodeModeParam,
  encodeModeParam,
  findCardBySlug,
  MODE_PARAM,
  toCardSlug,
} from '@/transmute/utils/transmuteUrlParams'

import { energyAttributeUrlCodec, useEnergyAttributeFilters } from './useEnergyAttributeFilters'
import { useFormattingTransmuteFilters } from './useFormattingTransmuteFilters'

export interface UseAllTransmuteSearchFilters {
  searchText: string
  setSearchText: (text: string) => void
  selectedCard: CardData | null
  selectCard: (card: CardData) => void
  direction: TransmuteDirection
  setDirection: (direction: TransmuteDirection) => void
  mode: TransmuteMode
  setMode: (mode: TransmuteMode) => void
  useCardSetFilters: ReturnType<typeof useTransmuteCardSetFilters>
  useEnergyAttributeFilters: ReturnType<typeof useEnergyAttributeFilters>
  useFormattingFilters: ReturnType<typeof useFormattingTransmuteFilters>
  resetFilters: () => void
  // A `?card` arrived before the card data, so it can't be resolved yet
  isPendingCardFromUrl: boolean
}

const pickValid = <T extends string>(value: unknown, valid: readonly T[], fallback: T): T =>
  valid.includes(value as T) ? (value as T) : fallback

export const useAllTransmuteSearchFilters = (
  cards: TransmuteCards | undefined
): UseAllTransmuteSearchFilters => {
  const cachedFilters = getCachedTransmuteSearchFilters()

  const [direction, setDirectionUntracked] = useState<TransmuteDirection>(DEFAULT_DIRECTION)
  const [mode, setModeUntracked] = useState<TransmuteMode>(DEFAULT_MODE)
  // Not cached: a shared URL carries the selected card instead
  const [searchText, setSearchTextUnlinked] = useState('')
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [pendingCardSlug, setPendingCardSlug] = useState<string | null>(null)

  // An empty field means no card, however it was emptied. Editing the text otherwise keeps the card.
  const setSearchText = (text: string) => {
    setSearchTextUnlinked(text)
    if (!text) setSelectedCard(null)
  }

  const selectCard = (card: CardData) => {
    setSelectedCard(card)
    setSearchTextUnlinked(card.name)
  }

  /*
   * Applied after mount, not as the initial state: the server renders the defaults, and the mode
   * changes the panel's structure (energy attributes shown or hidden), so a cached value in the first
   * client render is a hydration error. Checkboxes get away with it via `Checkbox`'s `isHydrated`.
   */
  useEffect(() => {
    setDirectionUntracked(pickValid(cachedFilters?.direction, ALL_DIRECTIONS, DEFAULT_DIRECTION))
    setModeUntracked(pickValid(cachedFilters?.mode, ALL_MODES, DEFAULT_MODE))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only: the cache is re-read every render
  }, [])

  const untrackedUseCardSetFilters = useTransmuteCardSetFilters(cachedFilters?.cardSets)
  const untrackedUseEnergyAttributeFilters = useEnergyAttributeFilters(
    cachedFilters?.energyAttributes
  )
  const untrackedUseFormattingFilters = useFormattingTransmuteFilters(cachedFilters?.formatting)

  // --------------------------------------------------
  // ------ Tracking user interaction on filters ------
  // --------------------------------------------------
  const { hasUserChangedFilter, createTrackedFilter, createTrackedSetter } = useFilterTracking()

  const TRACKED_FILTER_HANDLERS = {
    cardSet: ['handleCardSetFilterToggle', 'enableCardSetFilters', 'resetCardSetFilters'] as const,
    energyAttribute: [
      'handleEnergyAttributeFilterToggle',
      'enableEnergyAttributeFilters',
      'resetEnergyAttributeFilters',
    ] as const,
    formatting: ['handleFormattingFilterToggle', 'resetFormattingFilters'] as const,
  } as const

  const trackedSetDirection = createTrackedSetter(setDirectionUntracked)
  const trackedSetMode = createTrackedSetter(setModeUntracked)

  const trackedUseCardSetFilters = createTrackedFilter(untrackedUseCardSetFilters, [
    ...TRACKED_FILTER_HANDLERS.cardSet,
  ])
  const trackedUseEnergyAttributeFilters = createTrackedFilter(untrackedUseEnergyAttributeFilters, [
    ...TRACKED_FILTER_HANDLERS.energyAttribute,
  ])
  const trackedUseFormattingFilters = createTrackedFilter(untrackedUseFormattingFilters, [
    ...TRACKED_FILTER_HANDLERS.formatting,
  ])
  // --------------------------------------------------
  // --------------------------------------------------

  const { cardSetFilters, enableCardSetFilters, resetCardSetFilters } = trackedUseCardSetFilters
  const { energyAttributeFilters, enableEnergyAttributeFilters, resetEnergyAttributeFilters } =
    trackedUseEnergyAttributeFilters
  const { formattingFilters, resetFormattingFilters } = trackedUseFormattingFilters

  const resetFilters = () => {
    setSearchText('')
    setSelectedCard(null)
    trackedSetDirection(DEFAULT_DIRECTION)
    trackedSetMode(DEFAULT_MODE)
    resetCardSetFilters()
    resetEnergyAttributeFilters()
    resetFormattingFilters()
  }

  // --------------------------------------------------
  // ------------------- URL params -------------------
  // --------------------------------------------------

  // An unresolvable slug falls back to no selection, which `resetFilters` already left in place
  const applyCardSlug = (slug: string, from: TransmuteCards) => {
    const card = findCardBySlug(slug, from)
    if (card) selectCard(card)
  }

  // Resolved straight away when the cards are already here, so there's no pending render to flash
  const applyCardParam = (slug: string) => {
    if (cards) applyCardSlug(slug, cards)
    else setPendingCardSlug(slug)
  }

  useEffect(() => {
    if (pendingCardSlug === null || !cards) return
    applyCardSlug(pendingCardSlug, cards)
    setPendingCardSlug(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `applyCardSlug` is recreated every render
  }, [pendingCardSlug, cards])

  const applyModeParam = (value: string) => {
    const decoded = decodeModeParam(value)
    if (!decoded) return
    trackedSetMode(decoded.mode)
    trackedSetDirection(decoded.direction)
  }

  // Declared after the cached-mode effect above, so on arrival the URL's mode wins over the cache
  useFilterUrlParams({
    valueBindings: [
      {
        param: CARD_PARAM,
        // The pending slug holds the param in place, or the writer would erase it before it resolves
        value:
          pendingCardSlug ?? (selectedCard && cards ? toCardSlug(selectedCard, cards) : undefined),
        apply: applyCardParam,
      },
      { param: MODE_PARAM, value: encodeModeParam(mode, direction), apply: applyModeParam },
    ],
    filterBindings: [
      { codec: cardSetUrlCodec, filters: cardSetFilters, enableFilters: enableCardSetFilters },
      {
        codec: energyAttributeUrlCodec,
        filters: energyAttributeFilters,
        enableFilters: enableEnergyAttributeFilters,
      },
    ],
    resetFilters,
  })

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
      cacheTransmuteSearchFilters({
        direction,
        mode,
        cardSets: cardSetFilters,
        energyAttributes: energyAttributeFilters,
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
    direction,
    mode,
    cardSetFilters,
    energyAttributeFilters,
    formattingFilters,
    hasUserChangedFilter,
  ])

  return {
    searchText,
    setSearchText,
    selectedCard,
    selectCard,
    direction,
    setDirection: trackedSetDirection,
    mode,
    setMode: trackedSetMode,
    useCardSetFilters: trackedUseCardSetFilters,
    useEnergyAttributeFilters: trackedUseEnergyAttributeFilters,
    useFormattingFilters: trackedUseFormattingFilters,
    resetFilters,
    isPendingCardFromUrl: pendingCardSlug !== null,
  }
}
