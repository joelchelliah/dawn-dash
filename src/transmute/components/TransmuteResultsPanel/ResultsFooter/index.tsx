import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'

import { TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import { TransmuteView } from '@/transmute/hooks/useTransmuteResults'
import { isPotion } from '@/transmute/utils/transmuteLookup'
import { isMetaprogressCard } from '@/transmute/utils/transmuteCards'

import { MESSAGES } from '../messages'
import ModeName from '../ModeName'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ResultsFooterProps {
  view: TransmuteView
  selectedCard: CardData | null
  direction: TransmuteDirection
  mode: TransmuteMode
}

const ResultsFooter = ({ view, selectedCard, direction, mode }: ResultsFooterProps) => {
  const Mode = <ModeName mode={mode} />
  const Card = selectedCard && <strong>{selectedCard.name}</strong>

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

  const fallbackMessage = transmuteFallback
    ? MESSAGES.transmuteFallbackPool({ Mode, ...transmuteFallback })
    : monsterTransmuteSourceCount !== undefined && Card
      ? MESSAGES.monsterBannerFallback({
          Card,
          count: monsterTransmuteSourceCount,
          hasDirectSources: view.kind === 'cards',
        })
      : sidemuteFallback
        ? MESSAGES.sidemuteFallbackPool({ Mode, ...sidemuteFallback })
        : null

  // Only under a list: every potion has direct Brown sources today, so "also" holds. An empty
  // list would sit under a "never" headline, which this line would contradict.
  const potionTopUpMessage =
    direction === 'to' &&
    mode === 'sidemute' &&
    view.kind === 'cards' &&
    selectedCard &&
    Card &&
    isPotion(selectedCard.blightbane_id) &&
    MESSAGES.potionSidemuteTopUp({ Card, Mode, rarity: selectedCard.rarity })

  const metaprogressCount =
    direction === 'from' && view.kind === 'cards' ? view.cards.filter(isMetaprogressCard).length : 0
  const metaprogressMessage =
    metaprogressCount > 0 && MESSAGES.metaprogressResults({ count: metaprogressCount })

  const messages = [fallbackMessage, potionTopUpMessage, metaprogressMessage].filter(Boolean)

  return (
    <>
      {messages.map((message, index) => (
        <p key={index} className={cx('detail')}>
          {message}
        </p>
      ))}
    </>
  )
}

export default ResultsFooter
