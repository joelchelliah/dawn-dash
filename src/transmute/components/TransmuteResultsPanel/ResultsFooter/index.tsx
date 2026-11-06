import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'

import { TransmuteMode } from '@/transmute/types/rules'
import { TransmuteView } from '@/transmute/hooks/useTransmuteResults'

import { MESSAGES } from '../messages'
import ModeName from '../ModeName'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ResultsFooterProps {
  view: TransmuteView
  selectedCard: CardData | null
  mode: TransmuteMode
}

const ResultsFooter = ({ view, selectedCard, mode }: ResultsFooterProps) => {
  const Mode = <ModeName mode={mode} />

  const fallbacks =
    view.kind === 'cards'
      ? view
      : view.kind === 'state' && view.state.kind === 'all-hidden-by-card-sets'
        ? view.state
        : undefined
  const transmuteFallback =
    fallbacks && 'transmuteFallback' in fallbacks && fallbacks.transmuteFallback
  const sidemuteFallback = fallbacks?.sidemuteFallback

  // Monster fallback, when transmuting into a common
  const monsterTransmuteSourceCount =
    view.kind === 'cards'
      ? view.monsterTransmuteSourceCount
      : view.kind === 'state' && view.state.kind === 'monster-transmute-target'
        ? view.state.count
        : undefined

  const message = transmuteFallback
    ? MESSAGES.transmuteFallbackPool({ Mode, ...transmuteFallback })
    : monsterTransmuteSourceCount !== undefined && selectedCard
      ? MESSAGES.monsterBannerFallback({
          Card: <strong>{selectedCard.name}</strong>,
          count: monsterTransmuteSourceCount,
          hasDirectSources: view.kind === 'cards',
        })
      : sidemuteFallback
        ? MESSAGES.sidemuteFallbackPool({ Mode, ...sidemuteFallback })
        : null

  return message && <p className={cx('detail')}>{message}</p>
}

export default ResultsFooter
