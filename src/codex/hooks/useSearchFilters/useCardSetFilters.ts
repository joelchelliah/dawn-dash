import { useCallback } from 'react'

import {
  CardCodexSearchFilterCache,
  CardSet,
  CardSetFilterOption,
  SharedFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultCardSetFilterValueMap: Record<string, boolean> = {
  [CardSetFilterOption.Core]: true,
  [CardSetFilterOption.Metaprogress]: true,
  [CardSetFilterOption.Metamorphosis]: true,
  [CardSetFilterOption.Infinitum]: true,
  [CardSetFilterOption.Catalyst]: true,
  [CardSetFilterOption.Eclypse]: true,
  [CardSetFilterOption.Synthesis]: true,
  [SharedFilterOption.All]: true,
  [SharedFilterOption.None]: false,
}

const indexMap: Record<string, number[]> = {
  // Cardex additionally maps expansion 0 to Core — see `toCardSetIndex` below
  [CardSetFilterOption.Core]: [1, 4],
  [CardSetFilterOption.Metaprogress]: [2],
  [CardSetFilterOption.Metamorphosis]: [3],
  [CardSetFilterOption.Infinitum]: [5],
  [CardSetFilterOption.Catalyst]: [6],
  [CardSetFilterOption.Eclypse]: [7],
  [CardSetFilterOption.Synthesis]: [8],
}

const indexToValueMap: Record<number, string> = {
  [1]: CardSetFilterOption.Core,
  [2]: CardSetFilterOption.Metaprogress,
  [3]: CardSetFilterOption.Metamorphosis,
  [4]: CardSetFilterOption.Core,
  [5]: CardSetFilterOption.Infinitum,
  [6]: CardSetFilterOption.Catalyst,
  [7]: CardSetFilterOption.Eclypse,
  [8]: CardSetFilterOption.Synthesis,
}

export const allCardSets: string[] = CardSet.getAll()

const useBaseCardSetFilters = createFilterHook({
  defaultFilters: defaultCardSetFilterValueMap,
  allValues: allCardSets,
  indexMap,
  indexToValueMap,
})

/*
 * Nil (0) expansion cards and talents are labelled as Core, because they are always in the game.
 *
 * This remap is deliberately NOT in the shared `indexMap`, since that would also make index 0
 * *selectable* via the Core checkbox — which is only correct for cards. See the two hooks below.
 */
const CORE_INDEX = 1
const toCardSetIndex = (index: number) => (index === 0 ? CORE_INDEX : index)

const useSharedCardSetFilters = (cachedFilters?: CardCodexSearchFilterCache['cardSets']) => {
  const {
    filters,
    isIndexSelected,
    getValueFromIndex,
    handleFilterToggle,
    enableFilters,
    resetFilters,
  } = useBaseCardSetFilters(cachedFilters, '-')

  // Both tools label nil expansion as Core.
  const getCardSetNameFromIndex = useCallback(
    (index: number) => getValueFromIndex(toCardSetIndex(index)),
    [getValueFromIndex]
  )

  return {
    cardSetFilters: filters,
    isIndexSelected,
    getCardSetNameFromIndex,
    handleCardSetFilterToggle: handleFilterToggle,
    enableCardSetFilters: enableFilters,
    resetCardSetFilters: resetFilters,
  }
}

/*
 * Cardex: nil expansion cards are *selected* by the Core checkbox, so unticking Core hides them.
 */
export const useCardSetFilters = (cachedFilters?: CardCodexSearchFilterCache['cardSets']) => {
  const { isIndexSelected, ...rest } = useSharedCardSetFilters(cachedFilters)

  const isCardSetIndexSelected = useCallback(
    (index: number) => isIndexSelected(toCardSetIndex(index)),
    [isIndexSelected]
  )

  return { ...rest, isCardSetIndexSelected }
}

/*
 * Skilldex: nil expansion talents are NOT *selected* by the Core checkbox.
 *
 * Talents use expansion 0 as a structural marker for event-only talents, offers and some
 * unavailable talents. Those are filtered by their own tree sections rather than by card set, and
 * must stay visible even when Core is unticked — so `isIndexSelected(0)` must stay false here.
 */
export const useTalentCardSetFilters = (cachedFilters?: CardCodexSearchFilterCache['cardSets']) => {
  const { isIndexSelected, ...rest } = useSharedCardSetFilters(cachedFilters)

  return { ...rest, isCardSetIndexSelected: isIndexSelected }
}
