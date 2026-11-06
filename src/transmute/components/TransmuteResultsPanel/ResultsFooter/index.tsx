import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'

import { TransmuteMode } from '@/transmute/types/rules'
import { TransmuteView } from '@/transmute/hooks/useTransmuteResults'
import { COLOR, RARITY } from '@/transmute/utils/transmuteLookup'

import BannerPill from '../BannerPill'
import ModeName from '../ModeName'
import RarityLabel from '../RarityLabel'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ResultsFooterProps {
  view: TransmuteView
  selectedCard: CardData | null
  mode: TransmuteMode
}

const ResultsFooter = ({ view, selectedCard, mode }: ResultsFooterProps) => {
  const fallbacks =
    view.kind === 'cards'
      ? view
      : view.kind === 'state' && view.state.kind === 'all-hidden-by-card-sets'
        ? view.state
        : undefined
  const transmuteFallback =
    fallbacks && 'transmuteFallback' in fallbacks && fallbacks.transmuteFallback
  const sidemuteFallback = fallbacks?.sidemuteFallback

  if (transmuteFallback) {
    return (
      <p className={cx('detail')}>
        If you run out of valid <ModeName mode={mode} /> options, you are offered cards from a pool
        of <strong>{transmuteFallback.count}</strong>{' '}
        <RarityLabel rarity={transmuteFallback.rarity} /> cards, of any{' '}
        <strong>banner color</strong> you have access to.
      </p>
    )
  }

  // Monster fallback, when transmuting into a common
  const monsterTransmuteSourceCount =
    view.kind === 'cards'
      ? view.monsterTransmuteSourceCount
      : view.kind === 'state' && view.state.kind === 'monster-transmute-target'
        ? view.state.count
        : undefined

  if (monsterTransmuteSourceCount !== undefined && selectedCard) {
    const hasDirectSources = view.kind === 'cards'
    return (
      <p className={cx('detail')}>
        {!hasDirectSources && 'However, '}
        <strong>{selectedCard.name}</strong> can {hasDirectSources ? 'also' : 'still'} show up among
        the random <RarityLabel rarity={RARITY.Common} /> cards offered by any of the{' '}
        <strong>{monsterTransmuteSourceCount}</strong> <BannerPill color={COLOR.Monster} /> cards.
      </p>
    )
  }

  if (sidemuteFallback) {
    return (
      <p className={cx('detail')}>
        If you run out of valid <ModeName mode={mode} /> options, you are offered cards from a pool
        of <strong>{sidemuteFallback.count}</strong>{' '}
        <RarityLabel rarity={sidemuteFallback.rarity} /> potions.
      </p>
    )
  }

  return null
}

export default ResultsFooter
