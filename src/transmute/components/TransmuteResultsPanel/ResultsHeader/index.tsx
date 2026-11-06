import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'

import { TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import { TransmuteState, TransmuteView } from '@/transmute/hooks/useTransmuteResults'
import { COLOR, getTradepostExcludedGroup, RARITY } from '@/transmute/utils/transmuteLookup'

import BannerPill from '../BannerPill'
import ModeName from '../ModeName'
import RarityLabel from '../RarityLabel'

import EnergyAttributeIconsInline from './EnergyAttributeIconsInline'
import styles from './index.module.scss'

const cx = createCx(styles)

// The value every item shares, or `undefined` when they differ
const getSharedValue = (values: number[]) =>
  values.length > 0 && values.every((value) => value === values[0]) ? values[0] : undefined

const SUBTEXT_BLACK_TO_BROWN = (
  <>
    <BannerPill color={COLOR.Black} /> cards always sidemute into <BannerPill color={COLOR.Brown} />{' '}
    cards.
  </>
)
const SUBTEXT_MONSTER_SIDEMUTE = (
  <>
    All <BannerPill color={COLOR.Monster} /> cards can <strong>sidemute</strong> into any of the
    following <RarityLabel rarity={RARITY.Monster} /> cards.
  </>
)
const SUBTEXT_BROWN_SOURCES = (
  <>
    Both <BannerPill color={COLOR.Brown} /> and <BannerPill color={COLOR.Black} /> cards sidemute
    into <BannerPill color={COLOR.Brown} /> cards.
  </>
)
const SUBTEXT_MONSTER_TRANSMUTE = (
  <>
    <RarityLabel rarity={RARITY.Monster} /> cards transmute into{' '}
    <RarityLabel rarity={RARITY.Common} /> cards of any <strong>banner color</strong> you have
    access to.
  </>
)

interface ResultsHeaderProps {
  view: TransmuteView
  selectedCard: CardData | null
  direction: TransmuteDirection
  mode: TransmuteMode
}

// The headline above the results, plus the detail lines the filters and results call for
const ResultsHeader = ({ view, selectedCard, direction, mode }: ResultsHeaderProps) => {
  const Mode = <ModeName mode={mode} />
  const Card = <strong>{selectedCard?.name}</strong>
  const cantBeObtained = (
    <>
      {Card} can never be obtained <strong>from</strong> a {Mode}!
    </>
  )

  // The headline, plus an optional detail line under it
  const getStateText = (state: TransmuteState): [React.ReactNode, React.ReactNode?] => {
    switch (state.kind) {
      case 'unknown':
        return [<>Failed to find transmute data for {Card}!</>]
      // Tradepost is covered by the excluded-group headline below, so only sidemute gets here
      case 'white':
        return [
          <>
            Not enough data to know how <BannerPill color={COLOR.White} /> cards {Mode}!
          </>,
        ]
      case 'blocked':
        return [
          <>
            {Card} has no {Mode} results.
          </>,
          // Not blocked as such: no result is Monster rarity, so their same-color sidemute is empty
          state.groupId === 'EXCEPTION-MONSTER' ? (
            <>
              <RarityLabel rarity={RARITY.Monster} /> cards without a{' '}
              <BannerPill color={COLOR.Monster} /> cannot {Mode} into anything.
            </>
          ) : state.groupId === 'EXCEPTION-CURSE' ? (
            <>
              <strong>Cursed</strong> cards can never be selected as the target of a {Mode}.
            </>
          ) : (
            state.reason
          ),
        ]
      case 'transmute-fallback':
        return [
          // A color with nothing at the next rarity also lands here, with nothing to hide
          state.count > 0 ? (
            <>
              All of {Card}’s <strong>{state.count}</strong> {Mode} results are hidden by your{' '}
              <strong>filters</strong>.
            </>
          ) : (
            <>
              {Card} has no {Mode} results.
            </>
          ),
          state.requiredEnergyAttributes.length > 0 ? (
            <>
              Without <EnergyAttributeIconsInline attributes={state.requiredEnergyAttributes} />{' '}
              <strong>energy</strong>, you will be offered random{' '}
              <RarityLabel rarity={state.rarity} /> cards of any <strong>banner color</strong> you
              have access to.
            </>
          ) : (
            <>
              You will be offered random <RarityLabel rarity={state.rarity} /> cards of any{' '}
              <strong>banner color</strong> you have access to.
            </>
          ),
        ]
      case 'all-hidden-by-card-sets':
        return [
          <>
            All of {Card}’s <strong>{state.count}</strong> {Mode} results are hidden by your{' '}
            <strong>filters</strong>.
          </>,
          <>
            They are in the following card {state.cardSets.length > 1 ? 'sets' : 'set'}:
            {/* Spans rather than a list, since this renders inside the detail paragraph */}
            <span className={cx('detail__list')}>
              {state.cardSets.map((cardSet) => (
                <span key={cardSet} className={cx('detail__list-item')}>
                  <strong>{cardSet}</strong>
                </span>
              ))}
            </span>
          </>,
        ]
      case 'tradepost-nothing':
        return [
          <>
            {Card} has no {Mode} results.
          </>,
        ]
      case 'not-a-result':
        // Monster is the bottom of the ladder, so nothing transmutes into a Monster-rarity card
        if (mode === 'transmute' && selectedCard?.rarity === RARITY.Monster)
          return [
            <>
              <RarityLabel rarity={RARITY.Monster} /> cards can never be obtained{' '}
              <strong>from</strong> a {Mode}!
            </>,
          ]
        return [cantBeObtained]
      case 'black-target':
        return [
          <>
            <BannerPill color={COLOR.Black} /> cards can never be obtained <strong>from</strong> a{' '}
            {Mode}!
          </>,
          <>
            This is because <BannerPill color={COLOR.Black} /> cards sidemute into{' '}
            <BannerPill color={COLOR.Brown} /> cards.
          </>,
        ]
      case 'unreachable-with-filters': {
        const { requiredEnergyAttributes, requiredCardSet } = state
        const cardSetPhrase = requiredCardSet && (
          <>
            the <strong>{requiredCardSet}</strong> card set
          </>
        )
        const energyPhrase = requiredEnergyAttributes.length > 0 && (
          <>
            <strong>{requiredEnergyAttributes.length > 1 ? 'one of ' : ''}</strong>
            <EnergyAttributeIconsInline attributes={requiredEnergyAttributes} />{' '}
            <strong>energy</strong>
          </>
        )
        return [
          <>
            {Card} cannot be obtained with your current <strong>filters</strong>.
          </>,
          <>
            It requires {cardSetPhrase}
            {cardSetPhrase && energyPhrase && ' and '}
            {energyPhrase} to be obtainable via {Mode}.
          </>,
        ]
      }
      case 'monster-sidemute-target':
        return [
          <>
            Any of the <strong>{state.count}</strong> <BannerPill color={COLOR.Monster} /> cards can{' '}
            {Mode} into {Card}!
          </>,
        ]
      // Mirrors the listed case's headline. The Monster-banner route is in the footer for both.
      case 'monster-transmute-target':
        return [
          <>
            No {selectedCard && <BannerPill color={selectedCard.color} />}{' '}
            <RarityLabel rarity={RARITY.Monster} /> cards can {Mode} into {Card}.
          </>,
        ]
      case 'empty':
        return [
          direction === 'from' ? (
            <>
              {Card} cannot {Mode} into anything
            </>
          ) : (
            cantBeObtained
          ),
        ]
    }
  }

  const renderHeadline = (headline: React.ReactNode, detail?: React.ReactNode) => (
    <>
      <h2 className={cx('headline')}>{headline}</h2>
      {detail && <p className={cx('detail')}>{detail}</p>}
    </>
  )

  if (view.kind === 'no-card') {
    return renderHeadline(
      direction === 'from' ? (
        <>Search for a card to see which cards it can {Mode} into.</>
      ) : (
        <>Search for a card to see which cards can {Mode} into it.</>
      )
    )
  }

  const tradepostExcludedGroup =
    mode === 'tradepost' && selectedCard && getTradepostExcludedGroup(selectedCard)
  // One rule covers both directions
  if (view.kind === 'state' && tradepostExcludedGroup) {
    return renderHeadline(
      <>
        The {Mode} does not work with any{' '}
        {/* Monster is excluded by rarity, not banner: Monster-banner Rares and Legendaries are fine */}
        {tradepostExcludedGroup === 'Monster' ? (
          <RarityLabel rarity={RARITY.Monster} />
        ) : (
          <BannerPill color={COLOR.White} />
        )}{' '}
        cards!
      </>
    )
  }

  if (view.kind === 'state') return renderHeadline(...getStateText(view.state))

  const subtext =
    direction === 'from' && view.branch === 'black-to-brown'
      ? SUBTEXT_BLACK_TO_BROWN
      : direction === 'from' && view.branch === 'monster'
        ? SUBTEXT_MONSTER_SIDEMUTE
        : view.branch === 'monster-transmute'
          ? SUBTEXT_MONSTER_TRANSMUTE
          : direction === 'to' && mode === 'sidemute' && selectedCard?.color === COLOR.Brown
            ? SUBTEXT_BROWN_SOURCES
            : ''

  // Read off the visible cards rather than the rules, so the special branches (Black→Brown, Brown's
  // mixed sources, White's any-color results) name exactly what is listed, or nothing at all
  const sharedBanner = getSharedValue(view.cards.map((card) => card.color))
  const sharedRarity = getSharedValue(view.cards.map((card) => card.rarity))
  const hasDescriptor = sharedBanner !== undefined || sharedRarity !== undefined
  const descriptor = hasDescriptor && (
    <>
      {sharedBanner !== undefined && (
        <>
          <BannerPill color={sharedBanner} />{' '}
        </>
      )}
      {sharedRarity !== undefined && (
        <>
          <RarityLabel rarity={sharedRarity} />{' '}
        </>
      )}
    </>
  )

  // Checked rather than assumed for Tradepost: an unticked card set can filter the card itself out
  const includesItself = view.cards.some(
    (card) => card.blightbane_id === selectedCard?.blightbane_id
  )
  const isOnlyItself = includesItself && view.cards.length === 1
  const includingItself = !subtext && mode === 'tradepost' && includesItself && ', including itself'
  const isSingular = view.cards.length === 1
  const count = <strong>{view.cards.length}</strong>
  const cardsPhrase = hasDescriptor ? (
    <>
      {count} {descriptor}
      {isSingular ? 'card' : 'cards'}
    </>
  ) : isSingular ? (
    <>{count} card</>
  ) : (
    <>{count} different cards</>
  )

  const headlineFrom = isOnlyItself ? (
    <>
      {Card} can only {Mode} into itself.
    </>
  ) : (
    <>
      {Card} can {isSingular && 'only '}
      {Mode} into {cardsPhrase}
      {includingItself}.
    </>
  )
  const headlineTo = isOnlyItself ? (
    <>
      Only {Card} itself can {Mode} into {Card}.
    </>
  ) : (
    <>
      {isSingular ? 'Only ' : ''}
      {cardsPhrase} can {Mode} into {Card}
      {includingItself}.
    </>
  )

  return renderHeadline(direction === 'from' ? headlineFrom : headlineTo, subtext)
}

export default ResultsHeader
