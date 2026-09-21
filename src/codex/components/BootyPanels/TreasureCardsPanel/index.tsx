import { useMemo } from 'react'

import { enrichTreasureCards } from '@/codex/utils/treasureHelper'

import CodexErrorMessage from '../../CodexErrorMessage'
import CodexLastUpdated from '../../CodexLastUpdated'
import CodexLoadingMessage from '../../CodexLoadingMessage'
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
    <TreasureBasePanel type="TreasureCards" info={treasureInfo}>
      <CodexLoadingMessage isVisible={isLoading} progress={progress} codexType="card" />
      <CodexErrorMessage isVisible={isError && !isLoading} codexType="card" />
      {!isLoading && !isError && renderTreasures()}
    </TreasureBasePanel>
  )
}

export default TreasureCardsPanel
