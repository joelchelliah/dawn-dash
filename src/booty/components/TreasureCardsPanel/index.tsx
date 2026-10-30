import { useMemo } from 'react'

import DataErrorMessage from '@/shared/components/DataErrorMessage'
import DataLastUpdated from '@/shared/components/DataLastUpdated'
import DataLoadingMessage from '@/shared/components/DataLoadingMessage'

import { enrichTreasureCards } from '@/booty/utils/treasureHelper'

import { useBootyCardData } from '../BootyCardDataContext'
import TreasureBasePanel, { TreasurePanelMessage, TreasurePanelRow } from '../TreasureBasePanel'

import TreasureList from './TreasureList'

const TreasureCardsPanel = () => {
  const {
    cardData,
    isLoading,
    isLoadingInBackground,
    isError,
    isErrorInBackground,
    lastUpdated,
    progress,
  } = useBootyCardData()

  const treasures = useMemo(() => enrichTreasureCards(cardData), [cardData])

  const hasTreasures = !isLoading && !isError && treasures.length > 0
  const treasureInfo = hasTreasures ? (
    <>
      There are a total of <strong>{treasures.length} Treasure</strong> cards.
    </>
  ) : undefined

  const renderTreasures = () => {
    if (treasures.length === 0) {
      return <TreasurePanelMessage>No treasure cards found!</TreasurePanelMessage>
    }

    return (
      <>
        <TreasurePanelRow>
          <TreasureList treasures={treasures} cardData={cardData} />
        </TreasurePanelRow>
        <TreasurePanelRow>
          <DataLastUpdated
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
    <TreasureBasePanel type="TreasureCards" info={treasureInfo}>
      <DataLoadingMessage isVisible={isLoading} progress={progress} dataType="card" />
      <DataErrorMessage isVisible={isError && !isLoading} dataType="card" />
      {!isLoading && !isError && renderTreasures()}
    </TreasureBasePanel>
  )
}

export default TreasureCardsPanel
