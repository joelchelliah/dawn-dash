import { createCx } from '@/shared/utils/classnames'

import { TransmuteMode } from '@/transmute/types/rules'
import { TransmuteView } from '@/transmute/hooks/useTransmuteResults'

import ModeName, { getRarityName } from '../ModeName'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ResultsFooterProps {
  view: TransmuteView
  mode: TransmuteMode
}

const ResultsFooter = ({ view, mode }: ResultsFooterProps) => {
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
        If you run out of valid <ModeName mode={mode} /> options, you will choose from a pool of{' '}
        <strong>
          {transmuteFallback.count} {getRarityName(transmuteFallback.rarity)}
        </strong>{' '}
        cards, of any <strong>banner color</strong> you have access to.
      </p>
    )
  }

  if (sidemuteFallback) {
    return (
      <p className={cx('detail')}>
        If you run out of valid <ModeName mode={mode} /> options, you choose from a pool of{' '}
        <strong>
          {sidemuteFallback.count} {getRarityName(sidemuteFallback.rarity)}
        </strong>{' '}
        potions.
      </p>
    )
  }

  return null
}

export default ResultsFooter
