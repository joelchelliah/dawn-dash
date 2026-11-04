import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'
import { RARITIES } from '@/shared/components/RarityBorderedArtwork'

import { TransmuteEnergyAttribute, TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import { TransmuteState, TransmuteView } from '@/transmute/hooks/useTransmuteResults'
import { COLOR, RARITY } from '@/transmute/utils/transmuteLookup'

import EnergyAttributeIconsInline from './EnergyAttributeIconsInline'
import styles from './index.module.scss'

const cx = createCx(styles)

const MODE_NAMES: Record<TransmuteMode, string> = {
  transmute: 'Transmute',
  sidemute: 'Sidemute',
  tradepost: 'Tradepost',
}

const getSubtext = (mode: TransmuteMode, direction: TransmuteDirection) => {
  switch (mode) {
    case 'transmute':
      return (
        <>
          Cards of a {direction === 'from' ? 'higher' : 'lower'} <strong>rarity</strong>, and of the
          same <strong>banner color</strong>.
        </>
      )
    case 'sidemute':
      return (
        <>
          Cards of the same <strong>rarity</strong> and <strong>banner color</strong>.
        </>
      )
    case 'tradepost':
      return (
        <>
          Cards of the same <strong>rarity</strong> and <strong>banner color</strong>, including
          this one.
        </>
      )
  }
}

// "Same banner color" isn't true for these
const SUBTEXT_BLACK_TO_BROWN = 'Black cards sidemute into Brown cards of the same rarity'
const SUBTEXT_MONSTER_SIDEMUTE = (
  <>
    <strong>Monster</strong>-banner cards sidemute into any of the following{' '}
    <strong>Monster</strong> cards. Results are NOT affected by <strong>rarity</strong>,{' '}
    <strong>energy attributes</strong> or enabled <strong>card sets</strong>.
  </>
)
const SUBTEXT_BROWN_SOURCES = 'Brown and Black cards of the same rarity that sidemute into this one'
const SUBTEXT_MONSTER_TRANSMUTE = (
  <>
    All <strong>Monster</strong> cards transmute into any <strong>Common</strong> card, depending on
    your <strong>energy attributes</strong>.
  </>
)

const getRarityName = (rarity: number) => RARITIES[rarity]?.name ?? ''

interface ResultStateDetailsProps {
  view: TransmuteView
  selectedCard: CardData | null
  direction: TransmuteDirection
  mode: TransmuteMode
  selectedEnergyAttributes: TransmuteEnergyAttribute[]
}

// The headline above the results, plus the detail lines the filters and results call for
const ResultStateDetails = ({
  view,
  selectedCard,
  direction,
  mode,
  selectedEnergyAttributes,
}: ResultStateDetailsProps) => {
  const Mode = <span className={cx('mode')}>{MODE_NAMES[mode]}</span>
  const Card = <strong>{selectedCard?.name}</strong>
  const energyIcons = <EnergyAttributeIconsInline attributes={selectedEnergyAttributes} />
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
      // Distant Memory: every lookup comes back empty, but the game offers something else
      case 'white':
        if (mode === 'transmute')
          return [
            <>
              {Card} can {Mode} into Rare cards of any color you have access to
            </>,
          ]
        if (mode === 'sidemute')
          return [
            <>
              {Card} can {Mode} into one of the 6 Uncommon potions
            </>,
          ]
        return [
          <>
            {Card} has nothing to {Mode} into, so it stays in your deck
          </>,
        ]
      case 'blocked':
        return [
          <>
            {Card} can’t {Mode}
          </>,
          state.reason,
        ]
      case 'transmute-fallback':
        return [
          <>
            {Card} has no same-color {Mode} results left after your filters
          </>,
          <>
            You will be offered random {getRarityName(state.rarity)} cards of any colors you have
            access to {energyIcons}
          </>,
        ]
      case 'all-hidden-by-card-sets':
        return [
          <>
            All {state.count} {Mode} results for {Card} are in card sets you’ve unticked
          </>,
        ]
      case 'tradepost-nothing':
        return [
          <>
            {Card} has nothing to {Mode} into, so it stays in your deck
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
        return [cantBeObtained, 'Black cards sidemute into Brown instead']
      case 'unreachable-with-energy-attributes':
        return [
          cantBeObtained,
          <>
            None of the energy colors you have access to will let you transmute into this card{' '}
            {energyIcons}
          </>,
        ]
      case 'monster-sidemute-target':
        return [
          <>
            Any Monster-banner card can {Mode} into {Card}
          </>,
        ]
      case 'card-set-unticked':
        return [cantBeObtained, 'Its card set is unticked, so the game won’t offer it']
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

  // Monster-rarity cards are neither Tradepost sources nor results, so one rule covers both directions
  if (view.kind === 'state' && mode === 'tradepost' && selectedCard?.rarity === RARITY.Monster) {
    return renderHeadline(
      <>
        The {Mode} neither accepts nor grants any <strong>Monster</strong> cards!
      </>
    )
  }

  if (view.kind === 'state') return renderHeadline(...getStateText(view.state))

  const mainTextFrom = (
    <>
      {Card} can {Mode} into <strong>{view.cards.length}</strong> different cards.
    </>
  )
  const mainTextTo = (
    <>
      <strong>{view.cards.length}</strong> different cards can {Mode} into {Card}.
    </>
  )
  const subtext =
    direction === 'from' && view.branch === 'black-to-brown'
      ? SUBTEXT_BLACK_TO_BROWN
      : direction === 'from' && view.branch === 'monster'
        ? SUBTEXT_MONSTER_SIDEMUTE
        : view.branch === 'monster-transmute'
          ? SUBTEXT_MONSTER_TRANSMUTE
          : direction === 'to' && mode === 'sidemute' && selectedCard?.color === COLOR.Brown
            ? SUBTEXT_BROWN_SOURCES
            : getSubtext(mode, direction)

  return (
    <>
      {renderHeadline(direction === 'from' ? mainTextFrom : mainTextTo, subtext)}
      {view.transmuteRarity !== undefined && (
        <p className={cx('detail', 'detail--note')}>
          If you run out of valid {Mode} options, you will be offered random{' '}
          <strong>{getRarityName(view.transmuteRarity)}</strong> cards, depending on your{' '}
          <strong>energy attributes</strong>.
        </p>
      )}
    </>
  )
}

export default ResultStateDetails
