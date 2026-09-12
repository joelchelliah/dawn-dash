import { useMemo } from 'react'

import { createCx } from '@/shared/utils/classnames'

import { enrichTreasureCards } from '@/codex/utils/treasureHelper'
import { useCardData } from '@/codex/hooks/useCardData'

import CodexErrorMessage from '../../CodexErrorMessage'
import CodexLastUpdated from '../../CodexLastUpdated'
import CodexLoadingMessage from '../../CodexLoadingMessage'
import TreasureBasePanel from '../TreasureBasePanel'

import TreasureList from './TreasureList'
import styles from './index.module.scss'

const cx = createCx(styles)

const TreasureCardsPanel = () => {
  const {
    cardData,
    isLoading,
    isLoadingInBackground,
    isError,
    isErrorInBackground,
    lastUpdated,
    progress,
  } = useCardData()

  const treasures = useMemo(() => enrichTreasureCards(cardData), [cardData])

  const hasTreasures = !isLoading && !isError && treasures.length > 0
  const treasureInfo = hasTreasures ? (
    <>
      There are a total of {treasures.length} <strong>Treasure</strong> cards.
    </>
  ) : undefined

  const renderTreasures = () => {
    if (treasures.length === 0) {
      return <div className={cx('error-message')}>No treasure cards found!</div>
    }

    return (
      <>
        <div className={cx('treasure-list')}>
          <TreasureList treasures={treasures} />
        </div>
        <div className={cx('last-updated')}>
          <CodexLastUpdated
            type="card"
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            isLoadingInBackground={isLoadingInBackground}
            isErrorInBackground={isErrorInBackground}
            progress={progress}
          />
        </div>
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
