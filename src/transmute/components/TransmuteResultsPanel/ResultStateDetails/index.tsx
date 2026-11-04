import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'
import { RARITIES } from '@/shared/components/RarityBorderedArtwork'

import { TransmuteEnergyAttribute, TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import { TransmuteState, TransmuteView } from '@/transmute/hooks/useTransmuteResults'
import { COLOR } from '@/transmute/utils/transmuteLookup'

import EnergyAttributeIconsInline from './EnergyAttributeIconsInline'
import styles from './index.module.scss'

const cx = createCx(styles)

const MODE_NAMES: Record<TransmuteMode, string> = {
  transmute: 'Transmute',
  sidemute: 'Sidemute',
  tradepost: 'Tradepost',
}

// One line per direction × mode, kept together so they're easy to reword
const SUBTEXTS: Record<TransmuteDirection, Record<TransmuteMode, string>> = {
  from: {
    transmute: 'Cards one rarity higher, of the same banner color, that you can transmute into',
    sidemute: 'Cards of the same rarity and banner color',
    tradepost: 'Cards of the same rarity and banner color, this one included',
  },
  to: {
    transmute: 'Cards one rarity lower, of the same banner color, that transmute into this one',
    sidemute: 'Cards of the same rarity and banner color that sidemute into this one',
    tradepost: 'Cards of the same rarity and banner color that Tradepost can swap for this one',
  },
}

// "Same banner color" isn't true for these
const SUBTEXT_BLACK_TO_BROWN = 'Black cards sidemute into Brown cards of the same rarity'
const SUBTEXT_MONSTER_SIDEMUTE =
  'Monster-banner cards can sidemute into any of these, regardless of rarity or enabled card sets.'
const SUBTEXT_BROWN_SOURCES = 'Brown and Black cards of the same rarity that sidemute into this one'

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
      {Card} can’t be obtained from a {Mode}
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

  if (view.kind === 'state') return renderHeadline(...getStateText(view.state))

  const subtext =
    direction === 'from' && view.branch === 'black-to-brown'
      ? SUBTEXT_BLACK_TO_BROWN
      : direction === 'from' && view.branch === 'monster'
        ? SUBTEXT_MONSTER_SIDEMUTE
        : direction === 'to' && mode === 'sidemute' && selectedCard?.color === COLOR.Brown
          ? SUBTEXT_BROWN_SOURCES
          : SUBTEXTS[direction][mode]

  const cardCount = (
    <>
      {view.cards.length} {view.cards.length === 1 ? 'card' : 'cards'}
    </>
  )

  return (
    <>
      {renderHeadline(
        <>
          {Mode} results for {Card}
        </>
      )}
      <p className={cx('detail')}>
        {direction === 'from' ? (
          <>
            {Card} can {Mode} into {cardCount}
          </>
        ) : (
          <>
            {cardCount} can {Mode} into {Card}
          </>
        )}
        {view.hiddenCount > 0 && ` · ${view.hiddenCount} hidden by your filters`}
      </p>
      <p className={cx('detail')}>{subtext}</p>
      {view.transmuteRarity !== undefined && (
        <p className={cx('detail', 'detail--note')}>
          If the number of {Mode} results is smaller than your card choices, you will be offered
          random {getRarityName(view.transmuteRarity)} cards of any colors you have access to
        </p>
      )}
    </>
  )
}

export default ResultStateDetails
