import { useMemo } from 'react'

import { createCx } from '@/shared/utils/classnames'

import { enrichTreasureCards } from '@/codex/utils/treasureHelper'
import { useCardData } from '@/codex/hooks/useCardData'

import PanelHeader from '../../PanelHeader'
import CodexErrorMessage from '../../CodexErrorMessage'
import CodexLastUpdated from '../../CodexLastUpdated'
import CodexLoadingMessage from '../../CodexLoadingMessage'

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
    refresh,
    progress,
  } = useCardData()

  const treasures = useMemo(() => enrichTreasureCards(cardData), [cardData])

  const renderTreasures = () => {
    if (treasures.length === 0) {
      return <div className={cx('info-message')}>No treasure cards found!</div>
    }

    return (
      <>
        <div className={cx('treasure-panel__treasure-list')}>
          <TreasureList treasures={treasures} />
        </div>
        <div className={cx('treasure-panel__last-updated')}>
          <CodexLastUpdated
            type="card"
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            isLoadingInBackground={isLoadingInBackground}
            isErrorInBackground={isErrorInBackground}
            progress={progress}
            refresh={refresh}
          />
        </div>
      </>
    )
  }

  return (
    <div className={cx('treasure-panel')}>
      <div className={cx('treasure-panel__header')}>
        <PanelHeader type="TreasureCards" />
      </div>

      <div className={cx('treasure-panel__container')}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} codexType="card" />
        <CodexErrorMessage isVisible={isError && !isLoading} codexType="card" />
        {!isLoading && !isError && renderTreasures()}
      </div>
    </div>
  )
}

export default TreasureCardsPanel
