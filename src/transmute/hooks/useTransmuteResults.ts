import { useMemo } from 'react'

import { getCardSetName } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import { CardData } from '@/shared/types/cards'

import { TransmuteEnergyAttribute, TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import {
  getSidemuteResults,
  getSidemuteSources,
  getTradepostResults,
  getTradepostSources,
  getTransmuteResultRarity,
  getTransmuteResults,
  getTransmuteSources,
  getWhiteSidemuteOffer,
  isMonsterSidemuteResult,
  LookupBranch,
  LookupResult,
} from '@/transmute/utils/transmuteLookup'
import { sortLikeCardex, toCards, TransmuteCards } from '@/transmute/utils/transmuteCards'

// Everything the panel shows instead of a list. Copy lives in `ResultStateDetails`.
export type TransmuteState =
  | { kind: 'unknown' }
  // White sidemute (the potions of its rarity) or Tradepost. Its transmute is a list.
  | { kind: 'white'; rarity: number; count: number }
  | { kind: 'blocked'; reason: string }
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
  // Transmute _From_ emptied by the filters: the game fills the offer from other colors instead
  | { kind: 'transmute-fallback'; rarity: number }
  | { kind: 'all-hidden-by-card-sets'; count: number }
  | { kind: 'tradepost-nothing' }
  | { kind: 'empty' }

export type TransmuteView =
  | { kind: 'no-card' }
  | { kind: 'state'; state: TransmuteState }
  | {
      kind: 'cards'
      cards: CardData[]
      branch: LookupBranch
      // The rarity Transmute _From_ offers, for the general fallback line
      transmuteRarity?: number
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

  const id = selectedCard.blightbane_id
  const result = lookUp(id, direction, mode, selectedEnergyAttributes)

  const isInSelectedSet = (card: CardData) => isCardSetIndexSelected(card.expansion)
  // The game never offers a card from an unticked set. Monster sidemutes ignore card sets.
  const requiredCardSet =
    direction === 'to' && !isMonsterSidemuteResult(id) && !isInSelectedSet(selectedCard)
      ? getCardSetName(selectedCard.expansion)
      : undefined

  if (result.kind === 'blocked') return state({ kind: 'blocked', reason: result.group.reason })
  if (result.kind === 'unreachable-with-energy-attributes') {
    return state({
      kind: 'unreachable-with-filters',
      requiredEnergyAttributes: result.required,
      requiredCardSet,
    })
  }
  if (result.kind === 'white') {
    const offer = getWhiteSidemuteOffer(id)
    const count = toCards(offer.ids, cards).filter(isInSelectedSet).length
    return state({ kind: 'white', rarity: offer.rarity, count })
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

    if (sources.length === 0) return state({ kind: 'empty' })
    return { kind: 'cards', cards: sources, branch: result.branch }
  }

  const candidates = toCards(result.ids, cards)
  // The Monster-banner sidemute ignores card sets
  const visible = result.branch === 'monster' ? candidates : candidates.filter(isInSelectedSet)

  const hiddenBySets = candidates.length - visible.length
  // These already list every color, so there's no fallback left to mention
  const transmuteRarity =
    mode === 'transmute' && result.branch === 'normal' ? getTransmuteResultRarity(id) : undefined

  if (visible.length === 0) {
    if (transmuteRarity !== undefined) {
      return state({ kind: 'transmute-fallback', rarity: transmuteRarity })
    }
    if (mode === 'tradepost') return state({ kind: 'tradepost-nothing' })
    if (hiddenBySets > 0) return state({ kind: 'all-hidden-by-card-sets', count: hiddenBySets })
    return state({ kind: 'empty' })
  }

  return {
    kind: 'cards',
    cards: sortLikeCardex(visible),
    branch: result.branch,
    transmuteRarity,
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
