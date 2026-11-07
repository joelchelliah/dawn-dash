import { ReactNode, useMemo } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'

import styles from './index.module.scss'

interface ResultCardsByBannerProps {
  cards: CardData[]
  renderCard: (card: CardData, entryIndex: number) => ReactNode
  // Which banner a card is grouped under. Defaults to `card.color`; Transmute passes its data's own.
  getBanner?: (card: CardData) => number
  // Extra classes on each banner band
  bannerClassName?: string
}

const cx = createCx(styles)

const getCardColor = (card: CardData) => card.color

const ResultCardsByBanner = ({
  cards,
  renderCard,
  getBanner = getCardColor,
  bannerClassName,
}: ResultCardsByBannerProps) => {
  const cardsByBanner = useMemo(
    () =>
      cards.reduce(
        (acc, card) => {
          const banner = getBanner(card)
          acc[banner] = [...(acc[banner] || []), card]
          return acc
        },
        {} as Record<number, CardData[]>
      ),
    [cards, getBanner]
  )

  return (
    <div className={cx('results-groups')}>
      {Object.entries(cardsByBanner).map(([banner, bannerCards], groupIndex, groups) => {
        // Row index across *all* groups, so the stagger keeps running from one banner into the
        // next instead of restarting per group (which a CSS `nth-child` delay would do).
        const precedingCards = groups
          .slice(0, groupIndex)
          .reduce((total, [, groupCards]) => total + groupCards.length, 0)

        return (
          <div key={banner} className={cx('results-cards')}>
            <div
              className={cx(
                'results-cards__banner',
                `results-cards__banner--${banner}`,
                bannerClassName
              )}
            >
              {bannerCards.map((card, cardIndex) => renderCard(card, precedingCards + cardIndex))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ResultCardsByBanner
