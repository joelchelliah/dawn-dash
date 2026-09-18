import { useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'

import { CardData } from '@/codex/types/cards'

import { ArtworkLinkItem, ArtworkLinkList } from '../../shared/ArtworkLinkList'
import cardModalStyles from '../../shared/CardModal/index.module.scss'
import EnergyPip from '../../shared/EnergyPip'

import styles from './specialCondition.module.scss'

const cx = createCx(styles)
const cxCardModal = createCx(cardModalStyles)

const getBlightbaneUrl = (name: string) =>
  `https://www.blightbane.io/card/${name.replaceAll(' ', '_')}`

interface SpecialCondition {
  cards: string[]
  description: JSX.Element
  // Width of the cards column, in rem. Set per entry because the column is sized to hold the
  // longest card name without truncating, and that differs a lot between conditions.
  cardWidth: number
  cardWidthMobile: number
}

const ARTWORK_SIZE = 32
const ARTWORK_SIZE_MOBILE = 24

export const SPECIAL_CONDITIONS: Record<string, SpecialCondition | undefined> = {
  'Arcane Bow': {
    cards: ['Plain Bow', 'Stardart'],
    cardWidth: 8,
    cardWidthMobile: 7,
    description: (
      <>
        Play a <span className={cxCardModal('card-modal__hint__highlighted')}>Plain Bow</span> after
        having played at least <strong>10</strong>{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Stardarts</span> during the
        same combat.
        <br />
        <br />
        Make sure to <strong>not</strong> meet the conditions for{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Rainbow</span> at the same
        time.
      </>
    ),
  },
  Asteran: {
    cards: ['Steel Longsword'],
    cardWidth: 11,
    cardWidthMobile: 9,
    description: (
      <>
        Spend <EnergyPip classType={CharacterClass.Sunforge} /> energy to play{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Steel Longsword</span>{' '}
        <strong>9</strong> times during combat.
      </>
    ),
  },
  Astrakan: {
    cards: ['Asteran', 'Drakkan'],
    cardWidth: 7.5,
    cardWidthMobile: 7,
    description: (
      <>
        Have at least one{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Asteran</span> and one{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Drakkan</span> in your deck
        at the same time.
        <br />
        <br />
        You will lose <strong>all copies</strong> of both weapons when you meet this condition.
      </>
    ),
  },
}

interface SpecialConditionProps {
  condition: SpecialCondition
  cardData: CardData[] | undefined
}

function SpecialCondition({ condition, cardData }: SpecialConditionProps): JSX.Element {
  const categoriesByName = new Map((cardData ?? []).map((card) => [card.name, card.category]))

  // Handed to the stylesheet as custom properties, so the mobile width stays behind its media
  // query rather than needing a breakpoint check in JS.
  const widths = {
    '--special-condition-card-width': `${condition.cardWidth}rem`,
    '--special-condition-card-width-mobile': `${condition.cardWidthMobile}rem`,
  } as React.CSSProperties

  return (
    <div className={cx('special-condition')} style={widths}>
      <div className={cx('special-condition__cards')}>
        <ArtworkLinkList layout="stacked">
          {condition.cards.map((name) => (
            <SpecialConditionCard key={name} name={name} category={categoriesByName.get(name)} />
          ))}
        </ArtworkLinkList>
      </div>
      <div className={cx('special-condition__description')}>{condition.description}</div>
    </div>
  )
}

interface SpecialConditionCardProps {
  name: string
  category?: number
}

function SpecialConditionCard({ name, category }: SpecialConditionCardProps): JSX.Element {
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(name, null, category)

  return (
    <ArtworkLinkItem
      name={name}
      href={getBlightbaneUrl(name)}
      isExternal
      src={cardImageSrc}
      onImageSrcError={onImageSrcError}
      artworkSize={ARTWORK_SIZE}
      artworkSizeMobile={ARTWORK_SIZE_MOBILE}
    />
  )
}

export default SpecialCondition
