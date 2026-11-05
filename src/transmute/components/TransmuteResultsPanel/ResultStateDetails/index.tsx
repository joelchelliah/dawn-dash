import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'
import { RARITIES } from '@/shared/components/RarityBorderedArtwork'

import { TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import { TransmuteState, TransmuteView } from '@/transmute/hooks/useTransmuteResults'
import {
  COLOR,
  getTradepostExcludedGroup,
  getTransmuteResultRarity,
  RARITY,
} from '@/transmute/utils/transmuteLookup'

import EnergyAttributeIconsInline from './EnergyAttributeIconsInline'
import styles from './index.module.scss'

const cx = createCx(styles)

const MODE_NAMES: Record<TransmuteMode, string> = {
  transmute: 'Transmute',
  sidemute: 'Sidemute',
  tradepost: 'Tradepost',
}

const getCardsQualifier = (mode: TransmuteMode, direction: TransmuteDirection) => {
  switch (mode) {
    case 'transmute':
      return (
        <>
          of a {direction === 'from' ? 'higher' : 'lower'} <strong>rarity</strong> and the same{' '}
          <strong>banner color</strong>
        </>
      )
    case 'sidemute':
    case 'tradepost':
      return (
        <>
          of the same <strong>rarity</strong> and <strong>banner color</strong>
        </>
      )
  }
}

// "Same banner color" isn't true for these
const SUBTEXT_BLACK_TO_BROWN = (
  <>
    <strong>Black</strong> cards sidemute into <strong>Brown</strong> cards of the same rarity.
  </>
)
const SUBTEXT_MONSTER_SIDEMUTE = (
  <>
    All <strong>Monster</strong>-banner cards can <strong>sidemute</strong> into any of the
    following <strong>Monster</strong> cards.
  </>
)
const SUBTEXT_BROWN_SOURCES = 'Brown and Black cards of the same rarity that sidemute into this one'
const SUBTEXT_MONSTER_TRANSMUTE = (
  <>
    <strong>Monster</strong> cards transmute into <strong>Common</strong> cards of any{' '}
    <strong>banner color</strong> you have access to.
  </>
)

const getRarityName = (rarity: number) => RARITIES[rarity]?.name ?? ''

const getWhiteTransmuteSubtext = (card: CardData) => (
  <>
    It transmutes into{' '}
    <strong>{getRarityName(getTransmuteResultRarity(card.blightbane_id) ?? card.rarity)}</strong>{' '}
    cards of any <strong>banner color</strong> you have access to.
  </>
)

interface ResultStateDetailsProps {
  view: TransmuteView
  selectedCard: CardData | null
  direction: TransmuteDirection
  mode: TransmuteMode
}

// The headline above the results, plus the detail lines the filters and results call for
const ResultStateDetails = ({ view, selectedCard, direction, mode }: ResultStateDetailsProps) => {
  const Mode = <span className={cx('mode')}>{MODE_NAMES[mode]}</span>
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
        return [<>{Card} is newer than the transmute data, so there’s nothing to show for it yet</>]
      // Tradepost is covered by the excluded-group headline below, so only sidemute gets here
      case 'white':
        return [
          <>
            Not enough data to know how <strong>White</strong> cards {Mode}!
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
              <strong>Monster</strong> cards without a <strong>Monster</strong>-banner will never{' '}
              {Mode} into anything.
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
          <>
            {Card} has no {Mode} results left after your <strong>filters</strong>.
          </>,
          state.requiredEnergyAttributes.length > 0 ? (
            <>
              Without <EnergyAttributeIconsInline attributes={state.requiredEnergyAttributes} />{' '}
              <strong>energy</strong>, you will be offered random{' '}
              <strong>{getRarityName(state.rarity)}</strong> cards of any{' '}
              <strong>banner color</strong> you have access to.
            </>
          ) : (
            <>
              You will be offered random <strong>{getRarityName(state.rarity)}</strong> cards of any{' '}
              <strong>banner color</strong> you have access to.
            </>
          ),
        ]
      case 'all-hidden-by-card-sets':
        return [
          <>
            All {state.count} {Mode} results for {Card} are hidden by your <strong>filters</strong>.
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
            {state.potions && (
              <span className={cx('detail__line')}>
                Without any of these card sets, you will be offered the following{' '}
                <strong>{state.potions.cards.length}</strong>{' '}
                <strong>{getRarityName(state.potions.rarity)}</strong> potions.
              </span>
            )}
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
              <strong>Monster</strong> cards can never be obtained <strong>from</strong> a {Mode}!
            </>,
          ]
        return [cantBeObtained]
      case 'black-target':
        return [
          <>
            <strong>Black</strong> cards can never be obtained <strong>from</strong> a {Mode}!
          </>,
          <>
            Since <strong>Black</strong> cards sidemute into <strong>Brown</strong>, there is no way
            to sidemute <strong>into</strong> a <strong>Black</strong> card.
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
            {Card} cannot be obtained <strong>from</strong> a {Mode} with your current{' '}
            <strong>filters</strong>.
          </>,
          <>
            It requires {cardSetPhrase}
            {cardSetPhrase && energyPhrase && ' and '}
            {energyPhrase} to be obtainable.
          </>,
        ]
      }
      case 'monster-sidemute-target':
        return [
          <>
            Any of the <strong>{state.count}</strong> <strong>Monster</strong>-banner cards can{' '}
            {Mode} into {Card}!
          </>,
        ]
      case 'monster-transmute-target':
        return [
          <>
            Any of the <strong>{state.count}</strong> <strong>Monster</strong>-banner cards can{' '}
            {Mode} into {Card}!
          </>,
        ]
      case 'empty':
        return [
          direction === 'from' ? (
            <>
              {Card} can’t {Mode} into anything
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
        <>Search for a card to see which cards it can {Mode} into</>
      ) : (
        <>Search for a card to see which cards can {Mode} into it</>
      )
    )
  }

  const tradepostExcludedGroup =
    mode === 'tradepost' && selectedCard && getTradepostExcludedGroup(selectedCard)
  // One rule covers both directions
  if (view.kind === 'state' && tradepostExcludedGroup) {
    return renderHeadline(
      <>
        The {Mode} does not work with any <strong>{tradepostExcludedGroup}</strong> cards!
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
          : view.branch === 'white-transmute' && selectedCard
            ? getWhiteTransmuteSubtext(selectedCard)
            : direction === 'to' && mode === 'sidemute' && selectedCard?.color === COLOR.Brown
              ? SUBTEXT_BROWN_SOURCES
              : ''

  // Kept apart from `subtext`, since the headline's qualifier still holds for the listed cards
  const monsterNote = view.monsterTransmuteSourceCount !== undefined && (
    <>
      Any of the <strong>{view.monsterTransmuteSourceCount}</strong> <strong>Monster</strong>
      -banner cards can transmute into {Card}!
    </>
  )

  const qualifier = subtext ? null : <> {getCardsQualifier(mode, direction)}</>
  // Checked rather than assumed for Tradepost: an unticked card set can filter the card itself out
  const includesItself = view.cards.some(
    (card) => card.blightbane_id === selectedCard?.blightbane_id
  )
  const isOnlyItself = includesItself && view.cards.length === 1
  const includingItself = !subtext && mode === 'tradepost' && includesItself && ', including itself'
  const isSingular = view.cards.length === 1
  const count = <strong>{view.cards.length}</strong>
  const cardsPhrase = isSingular ? <>{count} card</> : <>{count} different cards</>

  const headlineFrom = isOnlyItself ? (
    <>
      {Card} can only {Mode} into itself.
    </>
  ) : (
    <>
      {Card} can {isSingular && 'only '}
      {Mode} into {cardsPhrase}
      {qualifier}
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
      {cardsPhrase}
      {qualifier} can {Mode} into {Card}
      {includingItself}.
    </>
  )

  return (
    <>
      {renderHeadline(direction === 'from' ? headlineFrom : headlineTo, subtext || monsterNote)}
      {view.transmuteRarity !== undefined && (
        <p className={cx('detail', 'detail--note')}>
          If you run out of valid {Mode} options, you will be offered random{' '}
          <strong>{getRarityName(view.transmuteRarity)}</strong> cards of any{' '}
          <strong>banner color</strong> you have access to..
        </p>
      )}
    </>
  )
}

export default ResultStateDetails
