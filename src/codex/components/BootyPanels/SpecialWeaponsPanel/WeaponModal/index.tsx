import { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'

import { CardData } from '@/codex/types/cards'
import { SpecialWeapon } from '@/codex/types/weapons'
import { getRelatedEvents, getRelatedTreasurePoolCards } from '@/codex/utils/treasureHelper'
import Section from '@/codex/components/shared/Section'

import CardModal, { getCardSubtitle } from '../../shared/CardModal'
import { WEAPON_ARTWORK } from '../../shared/cardArtwork'
import { Acquisition } from '../../shared/CardModal/AcquisitionFlag'
import styles from '../../shared/CardModal/index.module.scss'

import SpecialCondition, { SPECIAL_CONDITIONS } from './specialCondition'

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
  const specialCondition = SPECIAL_CONDITIONS[weapon.name]

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
      subtitle={getCardSubtitle(weapon, rarity?.name)}
      cardDetails={cardDetails}
      artwork={WEAPON_ARTWORK}
      cardNoun="weapon"
      acquisitions={getAcquisitions(weapon, Boolean(specialCondition))}
      acquisitionColumns={4}
      relatedEvents={getRelatedEvents(weapon)}
      relatedCards={getRelatedTreasurePoolCards(weapon, cardData)}
      sectionAfterAcquisitions={specialConditionSection}
      onClose={onClose}
    />
  )
}

export default WeaponModal
