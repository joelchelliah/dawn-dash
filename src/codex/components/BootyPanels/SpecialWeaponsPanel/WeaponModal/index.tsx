import { useMemo } from 'react'

import { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'
import { SpecialWeapon } from '@/codex/types/weapons'
import {
  getRelatedEvents,
  getRelatedTreasurePoolCards,
  getRelatedTreasurePoolTalents,
} from '@/codex/utils/treasureHelper'
import Section from '@/codex/components/shared/Section'

import CardModal, { getCardSubtitle } from '../../shared/CardModal'
import { WEAPON_ARTWORK } from '../../shared/cardArtwork'
import { Acquisition } from '../../shared/CardModal/AcquisitionFlag'
import styles from '../../shared/CardModal/index.module.scss'
import { Hl } from '../../shared/CardModal/Hl'

import SpecialCondition from './SpecialCondition'
import { getSpecialCondition } from './specialConditions'

const cx = createCx(styles)

const RARITY_COLOR = 'var(--rarity-color)'

const getAcquisitions = (weapon: SpecialWeapon, hasSpecialCondition: boolean): Acquisition[] => {
  const { fromCards, fromTalents, fromEvents } = weapon

  return [
    { label: 'Special', value: hasSpecialCondition },
    { label: 'Events', value: fromEvents.length > 0 },
    { label: 'Cards', value: fromCards.length > 0 },
    { label: 'Talents', value: fromTalents.length > 0 },
  ]
}

interface WeaponModalProps {
  weapon: SpecialWeapon
  cardDetails: CardData
  cardData: CardData[] | undefined
  onClose: () => void
}

function WeaponModal({ weapon, cardDetails, cardData, onClose }: WeaponModalProps): JSX.Element {
  const rarity = RARITIES[cardDetails.rarity]
  const specialCondition = getSpecialCondition(weapon.name)

  const relatedEvents = useMemo(() => getRelatedEvents(weapon), [weapon])
  const relatedCards = useMemo(
    () => getRelatedTreasurePoolCards(weapon, cardData),
    [weapon, cardData]
  )
  const relatedTalents = useMemo(() => getRelatedTreasurePoolTalents(weapon), [weapon])

  const specialConditionSection = specialCondition && (
    <Section
      title="Special condition"
      dividerColor={rarity ? RARITY_COLOR : undefined}
      spacing="medium"
    >
      <div className={cx('card-modal__hint')}>
        <SpecialCondition condition={specialCondition} cardData={cardData} />
      </div>
    </Section>
  )

  return (
    <CardModal
      cardName={weapon.name}
      subtitle={getCardSubtitle(weapon, weapon.rarity)}
      cardDetails={cardDetails}
      hasConjurationRoute={weapon.hasConjurationRoute}
      artwork={WEAPON_ARTWORK}
      cardNoun="weapon"
      acquisitions={getAcquisitions(weapon, Boolean(specialCondition))}
      acquisitionColumns={4}
      relatedEvents={relatedEvents}
      relatedCards={relatedCards}
      relatedTalents={relatedTalents}
      sectionAfterAcquisitions={specialConditionSection}
      additionalNotes={ADDITIONAL_NOTES[weapon.name]}
      onClose={onClose}
    />
  )
}

const getUntemperedRaidersRewardNote = (weaponName: string): JSX.Element => (
  <>
    If you have a <strong>Cursed</strong> Basic Attack in your deck, you can play{' '}
    <Hl>Raider&apos;s Reward</Hl> on a <Hl>{weaponName}</Hl>, to have it permanently replace your{' '}
    <strong>Cursed</strong> Basic Attack! This overrides the <strong>Untempered</strong> keyword.
    <br />
    Any non-<strong>Cursed</strong> Basic Attack will still be <strong>Untempered</strong> after
    transformation!
  </>
)

const ADDITIONAL_NOTES: Record<string, JSX.Element> = {
  Battlespear: getUntemperedRaidersRewardNote('Battlespear'),
  Monolith: getUntemperedRaidersRewardNote('Monolith'),
}

export default WeaponModal
