import { useMemo } from 'react'

import { enrichSpecialWeapons } from '@/codex/utils/weaponHelper'

import { useBootyCardData } from '../BootyCardDataContext'
import TreasureBasePanel, { TreasurePanelMessage, TreasurePanelRow } from '../TreasureBasePanel'

import WeaponList from './WeaponList'

const SpecialWeaponsPanel = () => {
  const { cardData } = useBootyCardData()

  const weapons = useMemo(() => enrichSpecialWeapons(cardData), [cardData])

  const weaponInfo =
    weapons.length > 0 ? (
      <>
        There are a total of {weapons.length} <strong>Special Basic Attack</strong> cards.
      </>
    ) : undefined

  return (
    <TreasureBasePanel type="SpecialWeapons" info={weaponInfo}>
      {weapons.length === 0 ? (
        <TreasurePanelMessage>No Special Basic Attacks found!</TreasurePanelMessage>
      ) : (
        <TreasurePanelRow>
          <WeaponList weapons={weapons} cardData={cardData} />
        </TreasurePanelRow>
      )}
    </TreasureBasePanel>
  )
}

export default SpecialWeaponsPanel
