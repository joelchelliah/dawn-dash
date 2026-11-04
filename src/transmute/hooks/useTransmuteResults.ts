import { useMemo } from 'react'

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
  isMonsterSidemuteResult,
  LookupBranch,
  LookupResult,
} from '@/transmute/utils/transmuteLookup'
import { sortLikeCardex, toCards, TransmuteCards } from '@/transmute/utils/transmuteCards'

// Everything the panel shows instead of a list. Copy lives in the panel.
export type TransmuteState =
  | { kind: 'unknown' }
  | { kind: 'white' }
  | { kind: 'blocked'; reason: string }
  | { kind: 'not-a-result' }
  | { kind: 'black-target' }
  | { kind: 'unreachable-with-energy-attributes' }
  | { kind: 'monster-sidemute-target' }
  | { kind: 'card-set-unticked' }
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
      // How many the filters hid: card sets, and energy attributes (Transmute _From_ only)
      hiddenCount: number
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

  if (result.kind === 'blocked') return state({ kind: 'blocked', reason: result.group.reason })
  if (result.kind !== 'ids') return state({ kind: result.kind })

  const isInSelectedSet = (card: CardData) => isCardSetIndexSelected(card.expansion)

  if (direction === 'to') {
    // Every Monster-banner card
    if (result.branch === 'monster') return state({ kind: 'monster-sidemute-target' })

    // The game never offers a card from an unticked set. Monster sidemutes ignore card sets.
    if (!isMonsterSidemuteResult(id) && !isInSelectedSet(selectedCard)) {
      return state({ kind: 'card-set-unticked' })
    }

    const sources = sortLikeCardex(toCards(result.ids, cards))

    if (sources.length === 0) return state({ kind: 'empty' })
    return { kind: 'cards', cards: sources, hiddenCount: 0, branch: result.branch }
  }

  const candidates = toCards(result.ids, cards)
  // The Monster-banner sidemute ignores card sets
  const visible = result.branch === 'monster' ? candidates : candidates.filter(isInSelectedSet)

  const hiddenBySets = candidates.length - visible.length
  const hiddenByEnergyAttributes = toCards(result.excludedByEnergyAttributes, cards).filter(
    isInSelectedSet
  ).length
  const transmuteRarity = mode === 'transmute' ? getTransmuteResultRarity(id) : undefined

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
    hiddenCount: hiddenBySets + hiddenByEnergyAttributes,
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
