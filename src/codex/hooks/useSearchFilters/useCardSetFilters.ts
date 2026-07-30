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
 * Cards in the nil (0) expansion are treated as Core cards.
 *
 * This remap is deliberately NOT in the shared `indexMap`, because talents use expansion 0 to
 *  mark event-only talents! See `useTalentCardSetFilters` below.
 */
const CORE_INDEX = 1
const toCardSetIndex = (index: number) => (index === 0 ? CORE_INDEX : index)

export const useCardSetFilters = (cachedFilters?: CardCodexSearchFilterCache['cardSets']) => {
  const {
    filters,
    isIndexSelected,
    getValueFromIndex,
    handleFilterToggle,
    enableFilters,
    resetFilters,
  } = useBaseCardSetFilters(cachedFilters, '-')

  const isCardSetIndexSelected = useCallback(
    (index: number) => isIndexSelected(toCardSetIndex(index)),
    [isIndexSelected]
  )
  const getCardSetNameFromIndex = useCallback(
    (index: number) => getValueFromIndex(toCardSetIndex(index)),
    [getValueFromIndex]
  )

  return {
    cardSetFilters: filters,
    isCardSetIndexSelected,
    getCardSetNameFromIndex,
    handleCardSetFilterToggle: handleFilterToggle,
    enableCardSetFilters: enableFilters,
    resetCardSetFilters: resetFilters,
  }
}

/*
 * Talent variant: index 0 is NOT remapped to Core.
 *
 * Talents use expansion 0 as a structural marker for event-only talents, so `isIndexSelected(0)`
 * must stay false.
 */
export const useTalentCardSetFilters = (cachedFilters?: CardCodexSearchFilterCache['cardSets']) => {
  const {
    filters,
    isIndexSelected,
    getValueFromIndex,
    handleFilterToggle,
    enableFilters,
    resetFilters,
  } = useBaseCardSetFilters(cachedFilters, '-')
  return {
    cardSetFilters: filters,
    isCardSetIndexSelected: isIndexSelected,
    getCardSetNameFromIndex: getValueFromIndex,
    handleCardSetFilterToggle: handleFilterToggle,
    enableCardSetFilters: enableFilters,
    resetCardSetFilters: resetFilters,
  }
}
