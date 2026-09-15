import { useMemo } from 'react'

import { enrichSpecialWeapons } from '@/codex/utils/weaponHelper'
import { useCardData } from '@/codex/hooks/useCardData'

import CodexErrorMessage from '../../CodexErrorMessage'
import CodexLastUpdated from '../../CodexLastUpdated'
import CodexLoadingMessage from '../../CodexLoadingMessage'
import TreasureBasePanel, { TreasurePanelMessage, TreasurePanelRow } from '../TreasureBasePanel'

import WeaponList from './WeaponList'

const SpecialWeaponsPanel = () => {
  const {
    cardData,
    isLoading,
    isLoadingInBackground,
    isError,
    isErrorInBackground,
    lastUpdated,
    progress,
  } = useCardData()

  const weapons = useMemo(() => enrichSpecialWeapons(cardData), [cardData])

  const hasWeapons = !isLoading && !isError && weapons.length > 0
  const weaponInfo = hasWeapons ? (
    <>
      There are a total of {weapons.length} <strong>Special Basic Attack</strong> cards.
    </>
  ) : undefined

  const renderWeapons = () => {
    if (weapons.length === 0) {
      return <TreasurePanelMessage>No Special Basic Attacks found!</TreasurePanelMessage>
    }

    return (
      <>
        <TreasurePanelRow>
          <WeaponList weapons={weapons} />
        </TreasurePanelRow>
        <TreasurePanelRow>
          <CodexLastUpdated
            type="card"
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            isLoadingInBackground={isLoadingInBackground}
            isErrorInBackground={isErrorInBackground}
            progress={progress}
          />
        </TreasurePanelRow>
      </>
    )
  }

  return (
    <TreasureBasePanel type="SpecialWeapons" info={weaponInfo}>
      <CodexLoadingMessage isVisible={isLoading} progress={progress} codexType="card" />
      <CodexErrorMessage isVisible={isError && !isLoading} codexType="card" />
      {!isLoading && !isError && renderWeapons()}
    </TreasureBasePanel>
  )
}

export default SpecialWeaponsPanel
