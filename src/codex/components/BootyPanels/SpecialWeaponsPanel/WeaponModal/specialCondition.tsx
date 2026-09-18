import { TALENT_ARTWORK_CATEGORY, useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'

import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { CardData } from '@/codex/types/cards'
import { Event } from '@/codex/types/events'
import eventTrees from '@/codex/data/event-trees.json'

import { ArtworkLinkItem, ArtworkLinkList } from '../../shared/ArtworkLinkList'
import cardModalStyles from '../../shared/CardModal/index.module.scss'
import EnergyPip from '../../shared/EnergyPip'

import styles from './specialCondition.module.scss'

const cx = createCx(styles)
const cxCardModal = createCx(cardModalStyles)

const EVENT_ARTWORK_BY_NAME = new Map(
  (eventTrees as Event[]).map(({ name, artwork }) => [name, artwork])
)

const getBlightbaneUrl = (name: string, isTalent: boolean) =>
  `https://www.blightbane.io/${isTalent ? 'talent' : 'card'}/${name.replaceAll(' ', '_')}`

interface SpecialCondition {
  cards: string[]
  talents?: string[]
  events?: string[]
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
    events: ['Marrow Halls'],
    cards: ['Steel Longsword'],
    cardWidth: 11,
    cardWidthMobile: 9,
    description: (
      <>
        Obtain the{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Steel Longsword</span> from
        the <span className={cxCardModal('card-modal__hint__highlighted')}>Marrow Halls</span>{' '}
        event.
        <br />
        <br />
        Spend <EnergyPip classType={CharacterClass.Sunforge} /> energy to play{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Steel Longsword</span>{' '}
        <strong>9</strong> times during combat.
        <br />
        <br />
        Must be <strong>not corrupted</strong>.
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
  Battlespear: {
    cards: ['Code of Steel', 'Divine Arsenal', 'Forged in Blood', 'Zealous Forging'],
    cardWidth: 10.5,
    cardWidthMobile: 9,
    description: (
      <>
        There are several cards that add <strong>Untempered</strong>{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Battlepears</span> to your
        deck.
        <br />
        <br />
        The only way to obtain a permanent copy is to make it <strong>Cursed</strong> during battle,
        which will remove the <strong>Untempered</strong> keyword.
      </>
    ),
  },
  Blaster: {
    talents: ['Triage Weapon', 'Doing My Part'],
    cards: ['Sergeant'],
    cardWidth: 10,
    cardWidthMobile: 8.5,
    description: (
      <>
        The <span className={cxCardModal('card-modal__hint__highlighted')}>Triage Weapon</span>{' '}
        power gives you the secret talent{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Doing My Part</span>, which
        rewards you for accumulated <strong>overkill</strong> damage.
        <br />
        <br />
        Passing <strong>499 overkill</strong> damage will promote you to{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Sergeant</span>, and reward
        you with a <span className={cxCardModal('card-modal__hint__highlighted')}>Blaster</span>.
      </>
    ),
  },
  Buzzsword: {
    talents: ['Triage Weapon', 'Doing My Part'],
    cards: ['Lieutenant'],
    cardWidth: 10,
    cardWidthMobile: 8.5,
    description: (
      <>
        The <span className={cxCardModal('card-modal__hint__highlighted')}>Triage Weapon</span>{' '}
        power gives you the secret talent{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Doing My Part</span>, which
        rewards you for accumulated <strong>overkill</strong> damage.
        <br />
        <br />
        Passing <strong>999 overkill</strong> damage will promote you to{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Lieutenant</span>, and reward
        you with a <span className={cxCardModal('card-modal__hint__highlighted')}>Buzzsword</span>.
      </>
    ),
  },
  'Celestial Claws': {
    cards: ['Moonclaws', 'Ascension I', 'Ascension II', 'Ascension III'],
    cardWidth: 9,
    cardWidthMobile: 7.75,
    description: (
      <>
        While <span className={cxCardModal('card-modal__hint__highlighted')}>Ascended</span>, any{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Moonclaws</span> drawn from
        your deck will <strong>temporarily</strong> transform into a{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Celestial Claws</span>.
        <br />
        <br />
        <span className={cxCardModal('card-modal__hint__highlighted')}>Moonclaws</span> always
        transform based on your current form.
      </>
    ),
  },
  'Demon Claws': {
    cards: ['Moonclaws', 'Demonform I', 'Demonform II', 'Demonform III'],
    cardWidth: 9.75,
    cardWidthMobile: 8.5,
    description: (
      <>
        While in <span className={cxCardModal('card-modal__hint__highlighted')}>Demonform</span>,
        any <span className={cxCardModal('card-modal__hint__highlighted')}>Moonclaws</span> drawn
        from your deck will <strong>temporarily</strong> transform into a{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Demon Claws</span>.
        <br />
        <br />
        <span className={cxCardModal('card-modal__hint__highlighted')}>Moonclaws</span> always
        transform based on your current form.
      </>
    ),
  },
  Drakkan: {
    events: ['Marrow Halls'],
    cards: ['Steel Longsword'],
    cardWidth: 11,
    cardWidthMobile: 9,
    description: (
      <>
        Obtain the{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Steel Longsword</span> from
        the <span className={cxCardModal('card-modal__hint__highlighted')}>Marrow Halls</span>{' '}
        event.
        <br />
        <br />
        Deal the killing blow <strong>9</strong> times with{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Steel Longsword</span> during
        combat.
        <br />
        <br />
        Must be <strong>corrupted</strong>.
      </>
    ),
  },
  Halifax: {
    cards: ['Rusty Spear'],
    cardWidth: 9,
    cardWidthMobile: 7.5,
    description: (
      <>
        Gain a total of <strong>150 Blessings</strong> while having a{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Rusty Spear</span> in hand.
      </>
    ),
  },
  Helios: {
    cards: ['Suntree Twig'],
    cardWidth: 9.5,
    cardWidthMobile: 8,
    description: (
      <>
        <strong>Bury</strong> the{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Suntree Twig</span>, on your
        turn, during any combat.
        <br />
        <br />
        Burying it during the enemy&apos;s turn does nothing.
      </>
    ),
  },
  Majatome: {
    cards: ['Dull Axe'],
    cardWidth: 7.5,
    cardWidthMobile: 6.5,
    description: (
      <>
        Trigger the <span className={cxCardModal('card-modal__hint__highlighted')}>Dull Axe</span>
        &apos;s <strong>Rebound</strong> by playing it total of <strong>40</strong> times during
        combat.
      </>
    ),
  },
  Monolith: {
    cards: ['Stone Legends'],
    cardWidth: 10.5,
    cardWidthMobile: 8.5,
    description: (
      <>
        Playing <span className={cxCardModal('card-modal__hint__highlighted')}>Stone Legends</span>{' '}
        adds an <strong>Untempered</strong>{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Monolith</span> to your deck.
        <br />
        <br />
        The only way to obtain a permanent copy is to make it <strong>Cursed</strong> during battle,
        which will remove the <strong>Untempered</strong> keyword.
      </>
    ),
  },
  Oathbreaker: {
    events: ['Eastern Blightwoods Finish'],
    cards: ['Daggers'],
    cardWidth: 14.5,
    cardWidthMobile: 8.5,
    description: (
      <>
        Have a <span className={cxCardModal('card-modal__hint__highlighted')}>Daggers</span> in your
        deck when fighting the <strong>Eastern Blightwoods</strong> Bandit leader.
        <br />
        <br />
        Then, recruit the bandits to <strong> work for you</strong> in the{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>
          Eastern Blightwoods Finish
        </span>{' '}
        event.
      </>
    ),
  },
  Rainbow: {
    cards: ['Plain Bow'],
    cardWidth: 8,
    cardWidthMobile: 7,
    description: (
      <>
        Play a <span className={cxCardModal('card-modal__hint__highlighted')}>Plain Bow</span> while
        having <EnergyPip classType={CharacterClass.Rogue} />{' '}
        <EnergyPip classType={CharacterClass.Arcanist} />{' '}
        <EnergyPip classType={CharacterClass.Warrior} />{' '}
        <EnergyPip classType={CharacterClass.Sunforge} /> left over.
      </>
    ),
  },
  Rhymebind: {
    cards: ['Broken Hilt'],
    cardWidth: 9,
    cardWidthMobile: 7.5,
    description: (
      <>
        Play and deal damage with{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Broken Hilt</span>, after
        having inflicted a total of <strong>100 Frozen</strong> while having{' '}
        <span className={cxCardModal('card-modal__hint__highlighted')}>Broken Hilt</span> in hand.
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
          {condition.events?.map((name) => (
            <SpecialConditionEvent key={name} name={name} />
          ))}
          {condition.talents?.map((name) => (
            <SpecialConditionCard key={name} name={name} isTalent />
          ))}
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
  // Talents aren't in `cardData`, so their artwork resolves through the fixed talent category
  // rather than a looked-up one.
  isTalent?: boolean
  category?: number
}

function SpecialConditionCard({
  name,
  isTalent,
  category,
}: SpecialConditionCardProps): JSX.Element {
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(
    name,
    null,
    isTalent ? TALENT_ARTWORK_CATEGORY : category
  )

  return (
    <ArtworkLinkItem
      name={name}
      href={getBlightbaneUrl(name, Boolean(isTalent))}
      isExternal
      src={cardImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={[isTalent ? 'talent' : 'card']}
      artworkSize={ARTWORK_SIZE}
      artworkSizeMobile={ARTWORK_SIZE_MOBILE}
    />
  )
}

function SpecialConditionEvent({ name }: { name: string }): JSX.Element {
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(EVENT_ARTWORK_BY_NAME.get(name) ?? '')

  return (
    <ArtworkLinkItem
      name={name}
      href={`/eventmaps/${normalizeEventNameForUrl(name)}`}
      isExternal={false}
      src={eventImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={['event']}
      artworkSize={ARTWORK_SIZE}
      artworkSizeMobile={ARTWORK_SIZE_MOBILE}
    />
  )
}

export default SpecialCondition
