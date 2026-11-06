import { useMemo } from 'react'

import { getCardSetName } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import { CardData } from '@/shared/types/cards'

import { TransmuteEnergyAttribute, TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import {
  COLOR,
  canReachWithEnergyAttributes,
  getCardColorAndRarity,
  getPotionIds,
  getSidemuteResults,
  getSidemuteSources,
  getTradepostResults,
  getTradepostSources,
  getTransmuteResultRarity,
  getRequiredEnergyAttributes,
  getTransmuteResults,
  getTransmuteSources,
  isMonsterSidemuteResult,
  LookupBranch,
  LookupResult,
  MONSTER_TRANSMUTE_SOURCE_IDS,
  poolOfRarity,
  RARITY,
} from '@/transmute/utils/transmuteLookup'
import { sortLikeCardex, toCards, TransmuteCards } from '@/transmute/utils/transmuteCards'

// What the game fills a short _From_ offer with, counted with the same filters as a listed result
export interface FallbackPool {
  rarity: number
  count: number
}

// Everything the panel shows instead of a list. Copy lives in `ResultsHeader` and `ResultsFooter`.
export type TransmuteState =
  | { kind: 'unknown' }
  // White sidemute (no player can do one yet, so either direction) or Tradepost. Its transmute is a
  // list.
  | { kind: 'white' }
  | { kind: 'blocked'; groupId: string; reason: string }
  | { kind: 'not-a-result' }
  | { kind: 'black-target' }
  // Only the filters rule it out: with every energy attribute and card set ticked it is reachable.
  // An empty `requiredEnergyAttributes` means the energy attributes aren't what's in the way.
  | {
      kind: 'unreachable-with-filters'
      requiredEnergyAttributes: TransmuteEnergyAttribute[]
      requiredCardSet?: string
    }
  | { kind: 'monster-sidemute-target'; count: number }
  // A Common with no same-color sources, which only Monster-banner cards transmute into
  | { kind: 'monster-transmute-target'; count: number }
  // Transmute _From_ emptied by the filters: the game fills the offer from other colors instead.
  // `requiredEnergyAttributes` would bring same-color results back; empty when only card sets
  // are in the way.
  | {
      kind: 'transmute-fallback'
      // Every same-color result the filters hide, whether by card set or by energy attribute
      count: number
      rarity: number
      requiredEnergyAttributes: TransmuteEnergyAttribute[]
    }
  // `cardSets` are the unticked card sets holding the results, in card-set order
  | {
      kind: 'all-hidden-by-card-sets'
      count: number
      cardSets: string[]
      sidemuteFallback?: FallbackPool
    }
  | { kind: 'tradepost-nothing' }
  | { kind: 'empty' }

export type TransmuteView =
  | { kind: 'no-card' }
  | { kind: 'state'; state: TransmuteState }
  | {
      kind: 'cards'
      cards: CardData[]
      branch: LookupBranch
      // Transmute _From_: every color of the next rarity
      transmuteFallback?: FallbackPool
      // Sidemute _From_: the potion top-up of the source's rarity
      sidemuteFallback?: FallbackPool
      // Transmute _To_ a Common: the Monster-banner cards that also transmute into it
      monsterTransmuteSourceCount?: number
    }

interface UseTransmuteResultsProps {
  cards: TransmuteCards
  selectedCard: CardData | null
  direction: TransmuteDirection
  mode: TransmuteMode
  selectedEnergyAttributes: TransmuteEnergyAttribute[]
  isCardSetIndexSelected: (index: number) => boolean
}

const lookUp = (
  id: number,
  direction: TransmuteDirection,
  mode: TransmuteMode,
  energyAttributes: TransmuteEnergyAttribute[]
): LookupResult => {
  if (direction === 'from') {
    if (mode === 'transmute') return getTransmuteResults(id, energyAttributes)
    if (mode === 'sidemute') return getSidemuteResults(id)
    return getTradepostResults(id)
  }
  if (mode === 'transmute') return getTransmuteSources(id, energyAttributes)
  if (mode === 'sidemute') return getSidemuteSources(id)
  return getTradepostSources(id)
}

const state = (value: TransmuteState): TransmuteView => ({ kind: 'state', state: value })

const getView = ({
  cards,
  selectedCard,
  direction,
  mode,
  selectedEnergyAttributes,
  isCardSetIndexSelected,
}: UseTransmuteResultsProps): TransmuteView => {
  if (!selectedCard) return { kind: 'no-card' }

  if (mode === 'sidemute' && selectedCard.color === COLOR.White) return state({ kind: 'white' })

  const id = selectedCard.blightbane_id
  const result = lookUp(id, direction, mode, selectedEnergyAttributes)

  const isInSelectedSet = (card: CardData) => isCardSetIndexSelected(card.expansion)
  // The game never offers a card from an unticked set. Monster sidemutes ignore card sets.
  const requiredCardSet =
    direction === 'to' && !isMonsterSidemuteResult(id) && !isInSelectedSet(selectedCard)
      ? getCardSetName(selectedCard.expansion)
      : undefined

  if (result.kind === 'blocked')
    return state({ kind: 'blocked', groupId: result.group.id, reason: result.group.reason })
  if (result.kind === 'unreachable-with-energy-attributes') {
    return state({
      kind: 'unreachable-with-filters',
      requiredEnergyAttributes: result.required,
      requiredCardSet,
    })
  }
  if (result.kind !== 'ids') return state(result)

  if (direction === 'to') {
    // Every Monster-banner card: too many to list, so only counted
    if (result.branch === 'monster') {
      return state({ kind: 'monster-sidemute-target', count: toCards(result.ids, cards).length })
    }

    if (requiredCardSet) {
      return state({
        kind: 'unreachable-with-filters',
        requiredEnergyAttributes: [],
        requiredCardSet,
      })
    }

    const sources = sortLikeCardex(toCards(result.ids, cards))
    const monsterTransmuteSourceCount =
      mode === 'transmute' && getCardColorAndRarity(id)?.[1] === RARITY.Common
        ? toCards(MONSTER_TRANSMUTE_SOURCE_IDS, cards).length
        : undefined

    if (sources.length === 0) {
      return monsterTransmuteSourceCount
        ? state({ kind: 'monster-transmute-target', count: monsterTransmuteSourceCount })
        : state({ kind: 'empty' })
    }
    return { kind: 'cards', cards: sources, branch: result.branch, monsterTransmuteSourceCount }
  }

  const candidates = toCards(result.ids, cards)
  // The Monster-banner sidemute ignores card sets
  const visible = result.branch === 'monster' ? candidates : candidates.filter(isInSelectedSet)

  const hiddenBySets = candidates.length - visible.length
  // These already list every color, so there's no fallback left to mention
  const transmuteRarity =
    mode === 'transmute' && result.branch === 'normal' ? getTransmuteResultRarity(id) : undefined

  const toFallback = (rarity: number | undefined, ids: (rarity: number) => number[]) => {
    if (rarity === undefined) return undefined
    const count = toCards(ids(rarity), cards).filter(isInSelectedSet).length
    return count > 0 ? { rarity, count } : undefined
  }
  const transmuteFallback = toFallback(transmuteRarity, (rarity) =>
    poolOfRarity(rarity).filter((x) => canReachWithEnergyAttributes(x, selectedEnergyAttributes))
  )
  // The Monster-banner sidemute always fills its offer, so it never needs the top-up
  const sidemuteFallback = toFallback(
    mode === 'sidemute' && result.branch !== 'monster' ? getCardColorAndRarity(id)?.[1] : undefined,
    getPotionIds
  )

  if (visible.length === 0) {
    if (transmuteRarity !== undefined) {
      // Only candidates in a ticked card set: ticking an attribute wouldn't bring the others back
      const excluded = toCards(result.excludedByEnergyAttributes, cards).filter(isInSelectedSet)
      const requiredEnergyAttributes = Array.from(
        new Set(excluded.flatMap((card) => getRequiredEnergyAttributes(card.blightbane_id)))
      )
      return state({
        kind: 'transmute-fallback',
        count: candidates.length + toCards(result.excludedByEnergyAttributes, cards).length,
        rarity: transmuteRarity,
        requiredEnergyAttributes,
      })
    }
    if (hiddenBySets > 0) {
      const hidden = candidates.filter((card) => !isInSelectedSet(card))
      const cardSets = Array.from(
        new Set(
          hidden
            .sort((a, b) => a.expansion - b.expansion)
            .map((card) => getCardSetName(card.expansion))
        )
      )
      return state({
        kind: 'all-hidden-by-card-sets',
        count: hiddenBySets,
        cardSets,
        sidemuteFallback,
      })
    }
    if (mode === 'tradepost') return state({ kind: 'tradepost-nothing' })
    return state({ kind: 'empty' })
  }

  return {
    kind: 'cards',
    cards: sortLikeCardex(visible),
    branch: result.branch,
    transmuteFallback,
    sidemuteFallback,
  }
}

export const useTransmuteResults = (props: UseTransmuteResultsProps): TransmuteView => {
  const { cards, selectedCard, direction, mode, selectedEnergyAttributes, isCardSetIndexSelected } =
    props

  return useMemo(
    () =>
      getView({
        cards,
        selectedCard,
        direction,
        mode,
        selectedEnergyAttributes,
        isCardSetIndexSelected,
      }),
    [cards, selectedCard, direction, mode, selectedEnergyAttributes, isCardSetIndexSelected]
  )
}
